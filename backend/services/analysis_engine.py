import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
import joblib
import os

class AnalysisEngine:
    def __init__(self, model_dir="backend/model_store"):
        self.model = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
        self.is_fitted = False
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

    def save_model(self, model_name):
        path = os.path.join(self.model_dir, f"{model_name}.joblib")
        joblib.dump({"model": self.model, "fitted": self.is_fitted}, path)
        print(f"Saved Analysis Model to {path}")

    def load_model(self, model_name):
        path = os.path.join(self.model_dir, f"{model_name}.joblib")
        if os.path.exists(path):
            data = joblib.load(path)
            self.model = data["model"]
            self.is_fitted = data["fitted"]
            print(f"Loaded Analysis Model from {path}")
        else:
            print(f"No model found at {path}")

    def train_anomaly_model(self, df: pd.DataFrame, feature_cols: list):
        """
        Trains Isolation Forest on historical data.
        """
        if df.empty or not feature_cols:
            return
            
        X = df[feature_cols].dropna()
        self.model.fit(X)
        self.is_fitted = True

    def calculate_degradation_score(self, df: pd.DataFrame, feature_cols: list):
        """
        Returns a Risk Score (0.0 to 1.0).
        Isolation Forest returns -1 for anomaly, 1 for normal.
        Decision function returns negative for anomaly, positive for normal.
        
        We invert this: Lower decision function = Higher Risk.
        """
        if not self.is_fitted:
            # Fallback if no training: just return 0s
            return [0.0] * len(df)
            
        X = df[feature_cols].fillna(0)
        
        # decision_function: average anomaly score of X of the base classifiers.
        # The anomaly score of an input sample is computed as the mean anomaly score of the trees in the forest.
        # It is strictly positive for normal observations and negative for abnormal ones.
        scores = self.model.decision_function(X)
        
        # Normalize roughly to 0-1 Risk
        # Score range is roughly -0.5 to 0.5 usually.
        # Risk = 1 / (1 + exp(score)) ? Or just simple scaling.
        # Let's map negative scores to High Risk.
        
        risk_scores = []
        for s in scores:
            if s >= 0:
                risk = 0.1 # Low risk
            else:
                # deeper negative = higher risk. e.g. -0.2 -> 0.7, -0.5 -> 1.0
                risk = min(1.0, 0.5 + abs(s)) 
            risk_scores.append(risk)
            
        return risk_scores

    def predict_time_to_threshold(self, df: pd.DataFrame, target_col: str, failure_threshold: float):
        """
        Predicts remaining useful life (RUL) using simple linear trend extrapolation.
        """
        if target_col not in df.columns or len(df) < 5:
            return None
            
        # Use Time as X (ordinal or index)
        # Assuming df is sorted by time and indices are proportional to time steps
        y = df[target_col].values
        X = np.arange(len(y)).reshape(-1, 1)
        
        reg = LinearRegression()
        reg.fit(X, y)
        
        slope = reg.coef_[0]
        intercept = reg.intercept_
        current_val = y[-1]
        
        # If slope is improving (moving away from threshold) or flat, infinite life
        # Condition: 
        # If threshold > current and slope > 0: degrading upwards
        # If threshold < current and slope < 0: degrading downwards
        
        is_degrading_up = (failure_threshold > current_val) and (slope > 0)
        is_degrading_down = (failure_threshold < current_val) and (slope < 0)
        
        if not (is_degrading_up or is_degrading_down):
            return -1 # Stable or improving
            
        # Solve: threshold = slope * (current_time + steps) + intercept
        # But reg was trained on 0..N. so intercept corresponds to time 0.
        # threshold = slope * time_x + intercept
        # time_x = (threshold - intercept) / slope
        # RUL (steps) = time_x - current_step(len-1)
        
        target_step = (failure_threshold - intercept) / slope
        rul_steps = target_step - (len(y) - 1)
        
        return max(0, rul_steps)
