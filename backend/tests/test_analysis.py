import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.services.analysis_engine import AnalysisEngine

def test_analysis_engine():
    ae = AnalysisEngine()
    
    # 1. Train Anomaly Model
    # Normal data: 2 features, random around 0
    df_train = pd.DataFrame({
        "f1": np.random.normal(0, 1, 100),
        "f2": np.random.normal(0, 1, 100)
    })
    
    ae.train_anomaly_model(df_train, ["f1", "f2"])
    
    # 2. Test Anomaly
    # Anomaly: values far from 0
    df_test = pd.DataFrame({
        "f1": [0, 10], # Normal, Abnormal
        "f2": [0, 10]
    })
    
    risks = ae.calculate_degradation_score(df_test, ["f1", "f2"])
    print("Risk Scores:", risks)
    
    assert risks[0] < 0.3 # Low risk
    assert risks[1] > 0.6 # High risk
    print("✅ Anomaly Detection passed.")
    
    # 3. Test RUL (Time to Threshold)
    print("Testing RUL...")
    # Linear trend: 0, 1, 2, 3, 4 (slope=1)
    # Threshold = 10.
    # Should take 6 more steps to reach 10.
    df_trend = pd.DataFrame({"val": [0, 1, 2, 3, 4]})
    
    rul = ae.predict_time_to_threshold(df_trend, "val", failure_threshold=10.0)
    print(f"Pred RUL: {rul} steps")
    
    # Slope=1, Intercept=0. Threshold=10. Target Step=10. Current Step=4. RUL=6.
    assert 5.0 <= rul <= 7.0 
    print("✅ RUL passed.")

if __name__ == "__main__":
    test_analysis_engine()
