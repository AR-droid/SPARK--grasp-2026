import numpy as np
import pandas as pd
from datetime import datetime
from statsmodels.tsa.arima.model import ARIMA
import tensorflow as tf
from tensorflow.keras import layers, models

from ..models.sensor import SensorData
from ..models.asset import Asset
from ..models.risk import RiskAssessment
from ..models.action import ActionItem
from ..models.shared import db
from .risk_reasoner import compute_cof, build_explainability, choose_degradation_type, serialize_explainability

class MLPipeline:
    def __init__(self):
        self.min_points_arima = 30
        self.min_points_lstm = 50

    def _series_from_records(self, records):
        df = pd.DataFrame([
            {
                "timestamp": r.timestamp,
                "value": r.value,
                "metric": r.type
            }
            for r in records
        ])
        if df.empty:
            return None, None, None
        df = df.sort_values("timestamp")
        metric = df["metric"].iloc[-1]
        return df["value"].values.astype(np.float32), metric, df

    def _arima_score(self, series):
        if series is None or len(series) < self.min_points_arima:
            return None
        try:
            model = ARIMA(series, order=(2, 1, 2))
            fitted = model.fit()
            residuals = fitted.resid
            score = np.mean(np.abs(residuals)) / (np.std(series) + 1e-6)
            return float(np.tanh(score))
        except Exception:
            return None

    def _lstm_score(self, series):
        if series is None or len(series) < self.min_points_lstm:
            return None
        try:
            tf.random.set_seed(42)
            series = np.array(series, dtype=np.float32)
            # Normalize
            min_v, max_v = series.min(), series.max()
            if max_v - min_v < 1e-6:
                return 0.0
            norm = (series - min_v) / (max_v - min_v)

            window = 10
            X, y = [], []
            for i in range(len(norm) - window):
                X.append(norm[i:i+window])
                y.append(norm[i+window])
            X = np.array(X)
            y = np.array(y)

            # Train/test split
            split = int(len(X) * 0.8)
            X_train, y_train = X[:split], y[:split]
            X_test, y_test = X[split:], y[split:]

            X_train = X_train[..., np.newaxis]
            X_test = X_test[..., np.newaxis]

            model = models.Sequential([
                layers.Input(shape=(window, 1)),
                layers.LSTM(16, return_sequences=False),
                layers.Dense(1)
            ])
            model.compile(optimizer='adam', loss='mse')
            model.fit(X_train, y_train, epochs=10, batch_size=16, verbose=0)

            preds = model.predict(X_test, verbose=0).flatten()
            mse = np.mean((preds - y_test) ** 2)
            return float(np.tanh(mse * 10))
        except Exception:
            return None

    def _combined_score(self, arima_score, lstm_score):
        scores = [s for s in [arima_score, lstm_score] if s is not None]
        if not scores:
            return 0.0
        return float(sum(scores) / len(scores))

    def run_for_assets(self, project_id, records):
        summary = []
        if not records:
            return summary

        # Group by asset + metric
        grouped = {}
        for r in records:
            key = (r.asset_id, r.type)
            grouped.setdefault(key, []).append(r)

        for (asset_id, metric), recs in grouped.items():
            risk = self.run_for_asset_metric(project_id, asset_id, metric, recs)
            if risk:
                summary.append(risk)

        return summary

    def run_for_asset_metric(self, project_id, asset_id, metric, records=None):
        asset = Asset.query.get(asset_id)
        if not asset:
            return None

        if records is None:
            records = SensorData.query.filter_by(asset_id=asset_id, type=metric).order_by(SensorData.timestamp.asc()).all()

        series, metric_label, df = self._series_from_records(records)
        if series is None:
            return None

        arima_score = self._arima_score(series)
        lstm_score = self._lstm_score(series)
        rof_score = self._combined_score(arima_score, lstm_score)

        # CoF based on industry + asset
        industry = ""
        if project_id:
            from ..models.project import Project
            project = Project.query.get(project_id)
            industry = project.industry if project else ""
        cof_score, _ = compute_cof(industry, asset.type)

        # Combine into overall risk
        risk_score = float(min(rof_score * cof_score + rof_score * 0.2, 1.0))

        signal_weights = None
        if df is not None and not df.empty:
            weights = df.groupby('metric')['value'].std().fillna(0)
            total = weights.sum()
            if total > 0:
                signal_weights = {k: float(v / total) for k, v in weights.to_dict().items()}
        explain = build_explainability(asset, industry, metric_label, rof_score, cof_score, signal_weights=signal_weights)
        degradation_type = choose_degradation_type(explain)

        risk_record = RiskAssessment(
            asset_id=asset_id,
            risk_score=risk_score,
            degradation_type=degradation_type,
            confidence_score=float(max(0.5, rof_score)),
            notes=serialize_explainability(explain)
        )
        db.session.add(risk_record)
        db.session.commit()

        # Create action recommendation if risk exceeds threshold and no open action exists
        recommendation = None
        if risk_score >= 0.7:
            recommendation = "REPAIR"
        elif risk_score >= 0.4:
            recommendation = "MONITOR"
        elif risk_score >= 0.25:
            recommendation = "DEFER"

        if recommendation:
            existing = ActionItem.query.filter_by(asset_id=asset_id, status="OPEN").first()
            if not existing:
                action = ActionItem(
                    asset_id=asset_id,
                    project_id=project_id,
                    risk_assessment_id=risk_record.id,
                    recommendation=recommendation,
                    notes=f"Auto-generated from ML risk score {risk_score:.2f}"
                )
                db.session.add(action)
                db.session.commit()

        return {
            "asset_id": asset_id,
            "metric": metric_label,
            "risk_score": risk_score,
            "rof_score": rof_score,
            "cof_score": cof_score,
            "degradation_type": degradation_type
        }
