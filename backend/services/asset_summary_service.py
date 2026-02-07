import pandas as pd
from .baseline_model import BaselineModel
from .analysis_engine import AnalysisEngine
from .risk_reasoner import compute_cof, build_explainability, choose_degradation_type
from ..models.sensor import SensorData
from ..models.risk import RiskAssessment
from ..models.asset import Asset
from ..models.project import Project

class AssetSummaryService:
    def __init__(self):
        self.baseline = BaselineModel()
        self.analysis = AnalysisEngine()

    def build_summary(self, asset_id, project_id=None):
        asset = Asset.query.get(asset_id)
        if not asset:
            return None

        # Load sensor data
        sensors = SensorData.query.filter_by(asset_id=asset_id).order_by(SensorData.timestamp.asc()).all()
        df = pd.DataFrame([{"timestamp": s.timestamp, "value": s.value, "type": s.type} for s in sensors])

        # Baseline
        baseline_info = {}
        baseline_confidence = 0
        if not df.empty:
            split = int(len(df) * 0.5)
            train = df.iloc[:split]
            baseline_info = self.baseline.train_baseline(asset.type, train, columns=['value'])
            baseline_confidence = min(1.0, len(train) / 100.0)

        # Risk assessment
        latest_risk = RiskAssessment.query.filter_by(asset_id=asset_id).order_by(RiskAssessment.timestamp.desc()).first()
        risk_score = latest_risk.risk_score if latest_risk else 0.0

        # Propagation (using risk score)
        impact_map = self.analysis.propagate_failure_risk(asset_id, risk_score)

        # Decision support
        industry = ''
        if project_id:
            proj = Project.query.get(project_id)
            industry = proj.industry if proj else ''
        cof_score, _ = compute_cof(industry, asset.type)

        decisions = [
            {"option": "Repair now", "safety_impact": "High", "cost": "High", "risk_reduction": min(1.0, risk_score + 0.3)},
            {"option": "Monitor", "safety_impact": "Medium", "cost": "Low", "risk_reduction": max(0.0, risk_score - 0.1)},
            {"option": "Defer with safeguards", "safety_impact": "Low", "cost": "Lowest", "risk_reduction": max(0.0, risk_score - 0.2)}
        ]

        explain = None
        if latest_risk and latest_risk.notes:
            try:
                import json
                explain = json.loads(latest_risk.notes)
            except Exception:
                explain = None
        if not explain:
            explain = build_explainability(asset, industry, df['type'].iloc[-1] if not df.empty else '', risk_score, cof_score)
        explain['degradation_type'] = choose_degradation_type(explain)

        return {
            "asset_id": asset_id,
            "baseline": {
                "params": baseline_info,
                "confidence": baseline_confidence
            },
            "risk": {
                "risk_score": risk_score,
                "cof_score": cof_score
            },
            "propagation": {
                "impact_map": impact_map,
                "affected_count": max(0, len(impact_map) - 1)
            },
            "decisions": decisions,
            "explainability": explain
        }
