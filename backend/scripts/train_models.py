import sys
import os
import glob
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.services.preprocessing_service import PreprocessingService
from backend.services.feature_engine import FeatureEngine
from backend.services.baseline_model import BaselineModel
from backend.services.analysis_engine import AnalysisEngine

def train_models_on_synthetic_data():
    print("🚀 Starting Model Training on Synthetic Data...")
    
    # Paths
    DATA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
    
    # Services
    prep = PreprocessingService()
    fe = FeatureEngine()
    baseline = BaselineModel()
    analysis = AnalysisEngine() # Note: In real app, we'd need one instance per asset/type
    
    # Asset Types to process
    asset_types = ["rotating_equipment", "pressure_vessels", "piping_networks", "storage_tanks", "heat_exchangers"]
    
    model_stats = []

    for asset_type in asset_types:
        print(f"\n📂 Processing Asset Type: {asset_type.upper()}")
        
        # Find relevant sensor files
        type_path = os.path.join(DATA_ROOT, asset_type, "sensor_timeseries")
        if not os.path.exists(type_path):
            print(f"⚠️  Path not found: {type_path}")
            continue
            
        csv_files = glob.glob(os.path.join(type_path, "*.csv"))
        if not csv_files:
            print("⚠️  No CSV files found.")
            continue
            
        # Merge all sensors for this asset type (Prototype simplification)
        # In reality, we'd train per asset, not per type, or have a generic type model.
        # Let's iterate files and train independent models for demo
        
        for csv_file in csv_files:
            filename = os.path.basename(csv_file)
            print(f"   training on {filename}...")
            
            try:
                df = pd.read_csv(csv_file)
                
                # Check column mapping
                # Synthetic data has 'processed' data structure usually: value, unit, etc?
                # Actually our generator made: time, value, unit OR time, specific_col, unit
                # Let's verify columns
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                cols_to_train = [c for c in numeric_cols if c not in ['time', 'timestamp', 'cycle']]
                
                if not cols_to_train:
                    print(f"      Skipping {filename}: No numeric columns found.")
                    continue
                
                # 1. Feature Engineering
                # Calculate rolling stats
                df_feats = fe.compute_rolling_stats(df, window=5, columns=cols_to_train)
                
                # Filter for Feature Columns (rolling mean/std)
                feat_cols = [c for c in df_feats.columns if 'roll_mean' in c or 'roll_std' in c]
                if not feat_cols:
                    feat_cols = cols_to_train # Fallback to raw values
                
                # 2. Train Baseline (Envelopes)
                # Assume entire dataset is "baseline" for this exercise
                thresholds = baseline.train_baseline(f"{asset_type}_{filename}", df_feats[cols_to_train]) # Train on raw for envelope
                
                # 3. Train Anomaly Detection (Isolation Forest)
                analysis.train_anomaly_model(df_feats, feat_cols)
                analysis.save_model(f"iso_forest_{asset_type}_{filename.replace('.csv','')}")
                
                # 4. Validate (Self-Check)
                # Predict on same data - should be mostly normal (Low Risk)
                risk_scores = analysis.calculate_degradation_score(df_feats, feat_cols)
                avg_risk = sum(risk_scores) / len(risk_scores)
                
                model_stats.append({
                    "Asset": asset_type,
                    "Sensor": filename,
                    "Features": len(feat_cols),
                    "Baseline_Mean": thresholds[cols_to_train[0]]['mean'] if cols_to_train else 0,
                    "Self_Test_Risk": avg_risk
                })
                
                print(f"      ✅ Trained & Saved. Avg Self-Risk: {avg_risk:.2f}")

            except Exception as e:
                print(f"      ❌ Training Failed: {e}")

    # Save aggregated baseline envelopes
    baseline.save_model()

    print("\n📊 Training Summary:")
    df_stats = pd.DataFrame(model_stats)
    if not df_stats.empty:
        print(df_stats.to_string(index=False))
        print("\n✅ All models trained successfully.")
    else:
        print("⚠️  No models returned stats.")

if __name__ == "__main__":
    train_models_on_synthetic_data()
