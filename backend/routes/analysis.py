from flask import Blueprint, request, jsonify
import pandas as pd
from ..services.baseline_model import BaselineModel
from ..services.analysis_engine import AnalysisEngine
from ..services.physics_mapper import PhysicsMapper

analysis_bp = Blueprint('analysis', __name__)

baseline_model = BaselineModel()
analysis_engine = AnalysisEngine()
physics_mapper = PhysicsMapper()

@analysis_bp.route('/run_diagnosis', methods=['POST'])
def run_diagnosis():
    """
    Triggers full diagnostic pipeline for an asset.
    Payload: { "asset_id": "PUMP-01", "asset_type": "rotating_equipment", "data": [...] }
    In real app, data is fetched from DB. Here we accept JSON payload for proto testing.
    """
    data = request.json
    asset_id = data.get('asset_id')
    asset_type = data.get('asset_type')
    raw_data = data.get('sensor_data', []) # List of dicts
    
    if not raw_data:
        return jsonify({"error": "No data provided"}), 400
        
    df = pd.DataFrame(raw_data)
    
    # Pipeline Execution
    try:
        # 1. Checking Baseline (assuming pre-trained for prototype demo)
        # Train on-the-fly for demo: first 50% is 'normal'
        split = int(len(df) * 0.5)
        df_train = df.iloc[:split]
        df_test = df.iloc[split:]
        
        baseline_model.train_baseline(asset_type, df_train)
        deviations = baseline_model.check_deviations(asset_type, df_test)
        
        # 2. Anomaly Detection
        # Assume 'value' is the feature for simplicity, or we compute features here
        analysis_engine.train_anomaly_model(df_train, ['value'])
        risk_scores = analysis_engine.calculate_degradation_score(df_test, ['value'])
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        # 3. Physics Mapping
        # Create a mock feature dict from the latest data
        latest_feat = {
            "vibration_roll_mean": df_test['value'].mean() if 'value' in df_test else 0
        }
        diagnosis = physics_mapper.map_failure_mode(asset_type, [], latest_feat)
        interpretation = physics_mapper.interpret_risk(avg_risk, diagnosis)
        
        return jsonify({
            "asset_id": asset_id,
            "risk_score": avg_risk,
            "diagnosis": diagnosis,
            "interpretation": interpretation,
            "details": {
                "deviations_count": len(deviations[deviations['baseline_deviation'] != ""])
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
