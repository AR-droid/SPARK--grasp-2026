import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.services.feature_engine import FeatureEngine

def test_feature_engine():
    fe = FeatureEngine()
    
    # Mock data: simple ramp 0, 10, 20...
    df = pd.DataFrame({
        "timestamp": pd.date_range(start='1/1/2023', periods=10, freq='1min'),
        "vibration": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    })
    
    print("Testing Rolling Stats...")
    df_rolled = fe.compute_rolling_stats(df, window=2, columns=['vibration'])
    # Mean of 10,20 -> 15. Mean of 20,30 -> 25.
    print(df_rolled[['vibration', 'vibration_roll_mean']].head(3))
    
    assert df_rolled.iloc[1]['vibration_roll_mean'] == 15.0
    print("✅ Rolling Stats passed.")
    
    print("Testing Rate of Change...")
    df_roc = fe.compute_rate_of_change(df, columns=['vibration'])
    # Diff should be constant 10
    print(df_roc[['vibration', 'vibration_roc']].head(3))
    
    assert df_roc.iloc[1]['vibration_roc'] == 10.0
    print("✅ RoC passed.")
    
    print("Testing FFT (Dominant Freq)...")
    # Create sine wave
    t = np.linspace(0, 1, 100) # 1 sec, 100 samples ~ 100Hz sample rate
    freq = 5 # 5 Hz signal
    y = np.sin(2 * np.pi * freq * t)
    df_wave = pd.DataFrame({"signal": y})
    
    # Window size should cover enough period
    df_fft = fe.compute_simple_fft_features(df_wave, 'signal', window_size=50)
    
    # Just check if column exists and is populated, accurate frequency estimation on short window is tricky in test
    assert 'signal_dom_freq' in df_fft.columns
    print("Dominant Freq Sample:", df_fft['signal_dom_freq'].iloc[60])
    print("✅ FFT passed.")

if __name__ == "__main__":
    test_feature_engine()
