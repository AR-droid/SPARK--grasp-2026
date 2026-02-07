import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class PreprocessingService:
    def __init__(self):
        pass

    def resample_timeseries(self, df: pd.DataFrame, freq='1h', agg_method='mean'):
        """
        Resamples sensor data to a common frequency to align datasets.
        """
        if df.empty:
            return df
            
        if 'timestamp' not in df.columns:
            raise ValueError("Dataframe must have a 'timestamp' column")
            
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp')
        
        # Resample only numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if agg_method == 'mean':
            resampled = df[numeric_cols].resample(freq).mean()
        elif agg_method == 'max':
            resampled = df[numeric_cols].resample(freq).max()
        else:
            resampled = df[numeric_cols].resample(freq).mean() # Default
            
        # Interpolate to fill small gaps created by resampling if needed, 
        # but for now we keep NaNs to let Validator catch large gaps if they persist.
        # Or we can simple Forward Fill for minor gaps.
        resampled = resampled.ffill(limit=1) 
        
        return resampled.reset_index()

    def align_inspection_data(self, sensor_df: pd.DataFrame, inspection_df: pd.DataFrame):
        """
        Aligns sporadic inspection events to the continuous sensor timeline.
        Adds 'last_inspection_finding' and 'days_since_inspection' to sensor_df.
        """
        if sensor_df.empty:
            return sensor_df
        
        sensor_df = sensor_df.copy()
        sensor_df['timestamp'] = pd.to_datetime(sensor_df['timestamp'])
        sensor_df = sensor_df.sort_values('timestamp')
        
        if inspection_df.empty:
            sensor_df['days_since_inspection'] = -1
            sensor_df['last_inspection_severity'] = 'Unknown'
            return sensor_df
            
        inspection_df = inspection_df.copy()
        inspection_df['date'] = pd.to_datetime(inspection_df['date'])
        inspection_df = inspection_df.sort_values('date')
        
        # Merge asof to find the last inspection for each sensor timestamp
        # 'timestamp' in sensor vs 'date' in inspection
        aligned = pd.merge_asof(
            sensor_df,
            inspection_df[['date', 'finding', 'inspector']], # Assuming these cols exist
            left_on='timestamp',
            right_on='date',
            direction='backward' # Look for closest past inspection
        )
        
        # specific feature: time decay since inspection
        aligned['days_since_inspection'] = (aligned['timestamp'] - aligned['date']).dt.total_seconds() / (3600 * 24)
        
        # Fill missing (before first inspection)
        aligned['days_since_inspection'] = aligned['days_since_inspection'].fillna(-1)
        aligned['finding'] = aligned['finding'].fillna("None")
        
        # Drop the extra date column from merge
        aligned = aligned.drop(columns=['date'])
        
        return aligned

    def normalize_data(self, df: pd.DataFrame, exclude_cols=None):
        """
        Normalizes numerical columns (Z-score).
        """
        if exclude_cols is None:
            exclude_cols = ['timestamp', 'id', 'asset_id']
            
        df = df.copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        cols_to_norm = [c for c in numeric_cols if c not in exclude_cols]
        
        for col in cols_to_norm:
            mean = df[col].mean()
            std = df[col].std()
            if std != 0:
                df[col] = (df[col] - mean) / std
            else:
                df[col] = 0.0 # Handle flatline case
                
        return df

    def convert_seconds_to_timestamp(self, seconds, base_time=None, start_time=None):
        """
        Converts seconds offset to a timestamp.
        If start_time is provided (ISO string), use it as base.
        If base_time is provided (datetime), use it as base.
        Otherwise default to current UTC time as base.
        """
        if start_time:
            base = pd.to_datetime(start_time)
        elif base_time:
            base = base_time
        else:
            base = datetime.utcnow()

        return base + timedelta(seconds=float(seconds))
