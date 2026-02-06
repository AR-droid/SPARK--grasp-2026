import pandas as pd
import numpy as np
from datetime import datetime

class DataQualityService:
    def __init__(self):
        pass

    def validate_sensor_data(self, df: pd.DataFrame, expected_freq='1min'):
        """
        Step 1: Data Validation & Quality Scoring
        Checks:
        - Mising values
        - Timestamp alignment (gaps)
        - Basic drift/noise check (variance)
        """
        report = {
            "score": 100,
            "flags": [],
            "stats": {}
        }
        
        # 1. Missing Values
        missing_count = df.isnull().sum().sum()
        total_cells = df.size
        missing_pct = (missing_count / total_cells) * 100
        
        if missing_pct > 5:
            report["score"] -= 20
            report["flags"].append(f"High missing data: {missing_pct:.1f}%")
        elif missing_pct > 0:
            report["score"] -= 5
            report["flags"].append(f"Minor missing data: {missing_pct:.1f}%")
            
        report["stats"]["missing_pct"] = missing_pct

        # 2. Timestamp Alignment (Gaps)
        if 'timestamp' in df.columns:
            # Ensure datetime
            if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
                try:
                    df['timestamp'] = pd.to_datetime(df['timestamp'])
                except:
                    report["score"] -= 50
                    report["flags"].append("Critical: Invalid timestamps")
                    return report

            df = df.sort_values('timestamp')
            time_diffs = df['timestamp'].diff().dropna()
            
            # Simple gap detection (if gap > 2x expected freq)
            # Assuming expected_freq is like '1min' -> pd.Timedelta('1min')
            # For simplicity in prototype, just check largest gap
            max_gap = time_diffs.max()
            median_gap = time_diffs.median()
            
            report["stats"]["max_gap_seconds"] = max_gap.total_seconds()
            
            if max_gap.total_seconds() > median_gap.total_seconds() * 5:
                 report["score"] -= 15
                 report["flags"].append(f"Sensor gaps detected (Max gap: {max_gap})")

        # 3. Sensor Drift / Static Check (Zero Variance)
        # Check numerical columns only
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            if df[col].std() == 0:
                report["score"] -= 10
                report["flags"].append(f"Sensor frozen: {col}")
                
        return report

    def validate_inspection_data(self, df: pd.DataFrame):
        """
        Checks for stale inspections.
        """
        report = {
            "score": 100,
            "flags": []
        }
        
        if 'date' not in df.columns:
            report["flags"].append("Missing 'date' column in inspection logs")
            return report
            
        # Check freshness (e.g., last inspection > 1 year ago)
        df['date'] = pd.to_datetime(df['date'])
        last_inspection = df['date'].max()
        days_since = (datetime.now() - last_inspection).days
        
        report["stats"] = {"days_since_last": days_since}
        
        if days_since > 365:
            report["score"] -= 30
            report["flags"].append(f"Stale inspection ({days_since} days old)")
            
        return report
