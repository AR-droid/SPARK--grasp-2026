import pandas as pd
import numpy as np

class FeatureEngine:
    def __init__(self):
        pass

    def compute_rolling_stats(self, df: pd.DataFrame, window=3, columns=None):
        """
        Computes rolling mean and standard deviation for specified columns.
        """
        if df.empty:
            return df
            
        df = df.copy()
        if columns is None:
            # Detect numeric columns, exclude timestamps/ids
            columns = df.select_dtypes(include=[np.number]).columns
            columns = [c for c in columns if c not in ['timestamp', 'days_since_inspection']] # Exclude metadata

        for col in columns:
            df[f'{col}_roll_mean'] = df[col].rolling(window=window).mean()
            df[f'{col}_roll_std'] = df[col].rolling(window=window).std()
            
        # Fill NaNs created by rolling window with 0 or first valid value
        df = df.fillna(method='bfill')
        return df

    def compute_rate_of_change(self, df: pd.DataFrame, columns=None):
        """
        Computes first discrete difference (Rate of Change).
        """
        if df.empty:
            return df
            
        df = df.copy()
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns
            columns = [c for c in columns if c not in ['timestamp', 'days_since_inspection', 'id']]

        for col in columns:
            # Assuming data is sorted by time already
            df[f'{col}_roc'] = df[col].diff()
            
        df = df.fillna(0) # First value Roc is 0
        return df
        
    def compute_simple_fft_features(self, df: pd.DataFrame, column, window_size=10):
        """
        Computes dominant frequency using FFT over a rolling window.
        Useful for vibration data.
        This is a simplified implementation for the prototype.
        """
        if column not in df.columns:
            return df
            
        df = df.copy()
        # Create a placeholder for dom_freq
        df[f'{column}_dom_freq'] = 0.0
        
        # We need a numeric numpy array
        vals = df[column].values
        
        # Loop with stride of 1 (expensive) or stride=window for features?
        # For simplicity, let's just do it for every 'window_size' chunk or just skip complicated FFT for now if rows are few.
        # Let's do a simple rolling window apply
        
        def get_dominant_freq(x):
            if len(x) < window_size:
                return 0
            # Remove DC component
            x = x - np.mean(x)
            fft_vals = np.fft.rfft(x)
            fft_freq = np.fft.rfftfreq(len(x))
            # Find max magnitude index
            idx = np.argmax(np.abs(fft_vals))
            return fft_freq[idx]

        # Use pandas rolling apply
        # Note: 'raw=True' passes ndarray
        df[f'{column}_dom_freq'] = df[column].rolling(window=window_size).apply(get_dominant_freq, raw=True).bfill()
        
        return df
