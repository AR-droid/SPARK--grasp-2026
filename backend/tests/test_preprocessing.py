import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.services.preprocessing_service import PreprocessingService

def test_preprocessing():
    prep = PreprocessingService()
    
    # 1. Test Resampling
    print("Testing Resampling...")
    dates = pd.date_range(start='1/1/2023', periods=120, freq='1min') # 2 hours
    values = np.random.rand(120) * 100
    df_sensor = pd.DataFrame({"timestamp": dates, "value": values})
    
    # Resample to 1 Hour
    df_resampled = prep.resample_timeseries(df_sensor, freq='1h', agg_method='mean')
    print(f"Original shape: {df_sensor.shape}, Resampled shape: {df_resampled.shape}")
    
    assert len(df_resampled) == 2 # 2 hours
    assert 'timestamp' in df_resampled.columns
    print("✅ Resampling passed.")
    
    # 2. Test Alignment
    print("Testing Inspection Alignment...")
    # Sensor data covers Jan 1 to Jan 5
    dates_long = pd.date_range(start='1/1/2023', end='1/5/2023', freq='1D')
    df_sensor_long = pd.DataFrame({"timestamp": dates_long, "value": range(5)})
    
    # Inspection on Jan 2
    df_insp = pd.DataFrame({
        "date": [pd.Timestamp('2023-01-02')],
        "finding": ["Corrosion Detected"],
        "inspector": ["Alice"]
    })
    
    df_aligned = prep.align_inspection_data(df_sensor_long, df_insp)
    print(df_aligned[['timestamp', 'finding', 'days_since_inspection']])
    
    # Check Jan 1 (Before inspection) -> Should be NaN or handled
    assert df_aligned.iloc[0]['finding'] == "None"
    assert df_aligned.iloc[0]['days_since_inspection'] == -1
    
    # Check Jan 3 (1 day after inspection)
    assert df_aligned.iloc[2]['finding'] == "Corrosion Detected"
    assert df_aligned.iloc[2]['days_since_inspection'] == 1.0
    print("✅ Alignment passed.")
    
    # 3. Test Normalization
    print("Testing Normalization...")
    df_norm = pd.DataFrame({"a": [10, 20, 30], "timestamp": [1,2,3]})
    df_norm = prep.normalize_data(df_norm, exclude_cols=['timestamp'])
    
    print(df_norm)
    # Mean of 10,20,30 is 20. Std is 10.
    # (20-20)/10 = 0
    assert df_norm.iloc[1]['a'] == 0.0
    print("✅ Normalization passed.")

if __name__ == "__main__":
    test_preprocessing()
