from flask import Blueprint, request, jsonify
import os
import math
import random
import time
from datetime import datetime, timedelta
import pandas as pd
from ..services.baseline_model import BaselineModel
from ..services.analysis_engine import AnalysisEngine
from ..services.physics_mapper import PhysicsMapper
from ..services.ml_pipeline import MLPipeline
from ..utils.auth import require_auth
from ..services.asset_summary_service import AssetSummaryService
from ..models.sensor import SensorData
from ..models.asset import Asset
from ..models.shared import db

analysis_bp = Blueprint('analysis', __name__)

baseline_model = BaselineModel()
analysis_engine = AnalysisEngine()
physics_mapper = PhysicsMapper()
ml_pipeline = MLPipeline()
summary_service = AssetSummaryService()

@analysis_bp.route('/lca_summary', methods=['GET'])
@require_auth
def lca_summary():
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'shared', 'cost_lca')
    costs_path = os.path.join(data_dir, 'repair_costs.csv')
    impact_path = os.path.join(data_dir, 'lifecycle_impact.csv')
    try:
        costs = []
        impacts = []
        if os.path.exists(costs_path):
            df = pd.read_csv(costs_path)
            costs = df.to_dict(orient='records')
        if os.path.exists(impact_path):
            df2 = pd.read_csv(impact_path)
            impacts = df2.to_dict(orient='records')
        return jsonify({
            "costs": costs,
            "impacts": impacts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route('/run_audio', methods=['POST'])
@require_auth
def run_audio():
    """
    Runs audio analysis using joblib model + YAMNet-style features.
    Accepts multipart form-data with file, asset_id, project_id (optional).
    If no file provided, uses a sample audio from data/ based on asset type.
    """
    asset_id = request.form.get('asset_id') or request.args.get('asset_id')
    if not asset_id:
        return jsonify({"error": "asset_id is required"}), 400

    asset = Asset.query.get(asset_id)
    if not asset:
        return jsonify({"error": "Asset not found"}), 404

    try:
        from ..services.audio_service import AudioService
        audio_service = AudioService()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    file = request.files.get('file')
    if file:
        result = audio_service.analyze_upload(file)
        return jsonify({
            "asset_id": asset_id,
            "source": "upload",
            "result": result
        })

    # fallback to sample audio
    asset_type = (asset.type or "").lower()
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
    sample = None
    if "pump" in asset_type or "rotating" in asset_type or "motor" in asset_type or "compressor" in asset_type:
        sample = os.path.join(data_dir, 'rotating_equipment', 'audio', 'bearing_fault.wav')
        if not os.path.exists(sample):
            sample = os.path.join(data_dir, 'rotating_equipment', 'audio', 'misalignment.wav')
    elif "heat exchanger" in asset_type:
        sample = os.path.join(data_dir, 'heat_exchangers', 'audio', 'cavitation.wav')
    elif "piping" in asset_type:
        sample = os.path.join(data_dir, 'piping_networks', 'audio', 'turbulence.wav')
    elif "pressure vessel" in asset_type:
        sample = os.path.join(data_dir, 'pressure_vessels', 'acoustic_emission', 'leak_hiss.wav')

    if not sample or not os.path.exists(sample):
        return jsonify({"error": "No audio sample found and no file uploaded"}), 404

    result = audio_service.predict_from_file(sample)
    return jsonify({
        "asset_id": asset_id,
        "source": "sample",
        "sample_file": os.path.basename(sample),
        "result": result
    })

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
SAMPLE_MAP = {
    "pressure vessel": ("pressure_vessels", "pressure"),
    "heat exchanger": ("heat_exchangers", "pressure_drop"),
    "storage tank": ("storage_tanks", "internal_pressure"),
    "piping": ("piping_networks", "pressure"),
    "rotating equipment": ("rotating_equipment", "vibration"),
    "pump": ("rotating_equipment", "vibration"),
    "motor": ("rotating_equipment", "temperature"),
    "compressor": ("rotating_equipment", "vibration"),
}

def seed_from_sample(asset, metric=None):
    if not asset:
        return False
    asset_type = (asset.type or "").lower()
    dataset_key = None
    default_metric = None
    for k, v in SAMPLE_MAP.items():
        if k in asset_type:
            dataset_key, default_metric = v
            break
    if not dataset_key:
        return False
    metric_name = metric or default_metric
    file_path = os.path.join(DATA_DIR, dataset_key, 'sensor_timeseries', f'{metric_name}.csv')
    if not os.path.exists(file_path):
        return False
    df = pd.read_csv(file_path)
    if 'time' not in df.columns:
        df['time'] = range(len(df))
    base_time = datetime.utcnow() - timedelta(seconds=float(df['time'].max()))
    records = []
    for _, row in df.iterrows():
        ts = base_time + timedelta(seconds=float(row['time']))
        records.append(SensorData(
            asset_id=asset.id,
            timestamp=ts,
            type=metric_name,
            value=float(row['value']),
            unit=str(row.get('unit', ''))
        ))
    db.session.bulk_save_objects(records)
    db.session.commit()
    return True

def seed_from_synthetic(asset, metric=None, count=120):
    if not asset:
        return False
    metric_name = metric or "generic"
    # Ensure different synthetic series each time
    random.seed(time.time_ns())
    SensorData.query.filter_by(asset_id=asset.id, type=metric_name).delete()
    db.session.commit()
    base_time = datetime.utcnow() - timedelta(seconds=count)
    records = []
    for i in range(count):
        t = i / max(1, count - 1)
        # simple synthetic signal with trend + noise
        base = 1.0 + 0.2 * math.sin(2 * math.pi * t)
        trend = 0.05 * t
        noise = random.uniform(-0.03, 0.03)
        value = base + trend + noise
        records.append(SensorData(
            asset_id=asset.id,
            timestamp=base_time + timedelta(seconds=i),
            type=metric_name,
            value=float(value),
            unit=""
        ))
    db.session.bulk_save_objects(records)
    db.session.commit()
    return True

@analysis_bp.route('/run_diagnosis', methods=['POST'])
@require_auth
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
@analysis_bp.route('/propagate-failure', methods=['POST'])
@require_auth
def propagate_failure():
    """
    Simulates failure propagation from a start node.
    Payload: { "asset_id": "P-101", "risk_score": 0.9 }
    """
    data = request.json
    asset_id = data.get('asset_id')
    risk = data.get('risk_score', 1.0)
    
    if not asset_id:
        return jsonify({"error": "Asset ID required"}), 400
        
    try:
        impact_map = analysis_engine.propagate_failure_risk(asset_id, risk)
        return jsonify({
            "source": asset_id,
            "impact_map": impact_map,
            "affected_count": len(impact_map) - 1 # exclude source
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route('/run_asset', methods=['POST'])
@require_auth
def run_asset():
    """
    Runs ML pipeline on stored sensor data for a given asset + metric.
    Payload: { "asset_id": "P-101", "metric": "pressure", "project_id": 1 }
    """
    data = request.json or {}
    asset_id = data.get('asset_id')
    metric = data.get('metric')
    project_id = data.get('project_id')

    if not asset_id:
        return jsonify({"error": "asset_id is required"}), 400

    try:
        asset = Asset.query.get(asset_id)
        if not asset:
            return jsonify({"error": "Asset not found"}), 404

        seeded = False

        # If metric not provided, use latest metric for this asset
        if not metric or metric == "Generic":
            latest = SensorData.query.filter_by(asset_id=asset_id).order_by(SensorData.timestamp.desc()).first()
            if latest:
                metric = latest.type
            else:
                seeded = seed_from_sample(asset, metric=None)
                if not seeded:
                    seeded = seed_from_synthetic(asset, metric=None)
                latest = SensorData.query.filter_by(asset_id=asset_id).order_by(SensorData.timestamp.desc()).first()
                metric = latest.type if latest else "Generic"
        else:
            # If metric provided but no records, try to seed
            has_metric = SensorData.query.filter_by(asset_id=asset_id, type=metric).first()
            if not has_metric:
                seeded = seed_from_sample(asset, metric=metric)
                if not seeded:
                    seeded = seed_from_synthetic(asset, metric=metric)

        result = ml_pipeline.run_for_asset_metric(project_id, asset_id, metric)
        if not result and not seeded:
            # Try seeding once if there is still no data
            seeded = seed_from_sample(asset, metric=metric) or seed_from_synthetic(asset, metric=metric)
            result = ml_pipeline.run_for_asset_metric(project_id, asset_id, metric)

        if not result:
            return jsonify({"error": "No data found for asset/metric"}), 404

        result["seeded"] = bool(seeded)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route('/asset-summary/<asset_id>', methods=['GET'])
@require_auth
def asset_summary(asset_id):
    project_id = request.args.get('project_id')
    try:
        result = summary_service.build_summary(asset_id, project_id)
        if not result:
            return jsonify({"error": "Asset not found"}), 404
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
