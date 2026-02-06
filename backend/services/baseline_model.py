import pandas as pd
import numpy as np
import pickle
import os

class BaselineModel:
    def __init__(self, model_dir="backend/model_store"):
        self.envelopes = {}
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

    def save_model(self, filename="baseline_envelopes.pkl"):
        path = os.path.join(self.model_dir, filename)
        with open(path, 'wb') as f:
            pickle.dump(self.envelopes, f)
        print(f"Saved Baseline Model to {path}")

    def load_model(self, filename="baseline_envelopes.pkl"):
        path = os.path.join(self.model_dir, filename)
        if os.path.exists(path):
            with open(path, 'rb') as f:
                self.envelopes = pickle.load(f)
            print(f"Loaded Baseline Model from {path}")
        else:
            print(f"No model found at {path}")

    def train_baseline(self, asset_type: str, df: pd.DataFrame, columns=None):
        """
        Calculates statistical baselines (Mean, Std, Min, Max) for an asset type.
        Assumes 'df' contains only 'Healthy' / 'Normal' data.
        """
        if df.empty:
            return {}
            
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns
            columns = [c for c in columns if c not in ['timestamp', 'id']]
            
        params = {}
        for col in columns:
            mean_val = df[col].mean()
            std_val = df[col].std()
            
            # Define 3-sigma envelope
            upper_bound = mean_val + (3 * std_val)
            lower_bound = mean_val - (3 * std_val)
            
            params[col] = {
                "mean": float(mean_val),
                "std": float(std_val),
                "upper_bound": float(upper_bound),
                "lower_bound": float(lower_bound)
            }
            
        self.envelopes[asset_type] = params
        return params

    def check_deviations(self, asset_type: str, df: pd.DataFrame):
        """
        Checks new data against the trained baseline.
        Returns a dataframe with deviation flags.
        """
        if asset_type not in self.envelopes:
            raise ValueError(f"No baseline trained for {asset_type}")
            
        params = self.envelopes[asset_type]
        df_out = df.copy()
        
        deviations = []
        for index, row in df.iterrows():
            row_devs = []
            for col, bounds in params.items():
                if col in row:
                    val = row[col]
                    if val > bounds["upper_bound"]:
                        row_devs.append(f"{col} HIGH ({val:.2f} > {bounds['upper_bound']:.2f})")
                    elif val < bounds["lower_bound"]:
                        row_devs.append(f"{col} LOW ({val:.2f} < {bounds['lower_bound']:.2f})")
            
            deviations.append("; ".join(row_devs))
            
        df_out['baseline_deviation'] = deviations
        return df_out
