import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.services.baseline_model import BaselineModel

def test_baseline_model():
    bm = BaselineModel()
    
    # 1. Train on "Healthy" data (Mean=10, Std~0)
    # Using small std to make deviation easy
    df_train = pd.DataFrame({
        "pressure": [10.0, 10.1, 9.9, 10.0, 10.05, 9.95]
    })
    
    thresholds = bm.train_baseline("pressure_vessel", df_train)
    print("Trained Thresholds:", thresholds)
    
    # Mean ~10. Std ~0.07. Upper Bound ~10.21.
    assert thresholds['pressure']['mean'] > 9.9
    assert thresholds['pressure']['upper_bound'] < 11.0
    print("✅ Training passed.")
    
    # 2. Check Deviations (Anomaly)
    df_test = pd.DataFrame({
        "pressure": [10.0, 12.0, 8.0] # 10=Normal, 12=High, 8=Low
    })
    
    df_result = bm.check_deviations("pressure_vessel", df_test)
    print("Deviation Results:")
    print(df_result)
    
    # Row 0: Normal
    assert df_result.iloc[0]['baseline_deviation'] == ""
    # Row 1: High
    assert "pressure HIGH" in df_result.iloc[1]['baseline_deviation']
    # Row 2: Low
    assert "pressure LOW" in df_result.iloc[2]['baseline_deviation']
    
    print("✅ Deviation Check passed.")

if __name__ == "__main__":
    test_baseline_model()
