from flask import Blueprint, jsonify, request
from ..models.shared import db
from ..models.asset import Asset
from ..models.sensor import SensorData
from ..models.risk import RiskAssessment
from ..models.inspection import InspectionRecord
import pandas as pd
import json
from ..utils.auth import require_auth

assets_bp = Blueprint('assets', __name__)

@assets_bp.route('/', methods=['GET'])
@require_auth
def get_assets():
    """
    Get all assets with summary risk data.
    """
    project_id = request.args.get('project_id')
    query = Asset.query
    
    if project_id:
        query = query.filter_by(project_id=project_id)
        
    assets = query.all()
    results = []
    
    for asset in assets:
        # Get latest risk
        latest_risk = RiskAssessment.query.filter_by(asset_id=asset.id).order_by(RiskAssessment.timestamp.desc()).first()
        risk_level = "Low"
        if latest_risk:
            if latest_risk.risk_score > 0.7:
                risk_level = "High"
            elif latest_risk.risk_score > 0.3:
                risk_level = "Medium"
                
        results.append({
            **asset.to_dict(),
            "risk_level": risk_level,
            "risk_score": latest_risk.risk_score if latest_risk else 0
        })
        
    return jsonify(results)

@assets_bp.route('/', methods=['POST'])
@require_auth
def create_asset():
    data = request.get_json() or {}
    asset_id = data.get('id')
    name = data.get('name')
    asset_type = data.get('type')
    location = data.get('location', '')
    project_id = data.get('project_id')
    metadata = data.get('metadata')

    if not asset_id or not name or not asset_type:
        return jsonify({"error": "id, name, and type are required"}), 400

    existing = Asset.query.get(asset_id)
    if existing:
        # Upsert behavior: update existing asset for the same project
        if project_id and existing.project_id and existing.project_id != project_id:
            return jsonify({"error": "Asset ID exists in another project"}), 409
        existing.name = name
        existing.type = asset_type
        existing.location = location
        if project_id:
            existing.project_id = project_id
        if metadata is not None:
            try:
                existing.metadata_json = json.dumps(metadata)
            except Exception:
                pass
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    asset = Asset(
        id=asset_id,
        name=name,
        type=asset_type,
        location=location,
        project_id=project_id,
        metadata_json=json.dumps(metadata) if metadata is not None else None
    )
    db.session.add(asset)
    db.session.commit()
    return jsonify(asset.to_dict()), 201

@assets_bp.route('/<asset_id>', methods=['GET'])
@require_auth
def get_asset_details(asset_id):
    """
    Get detailed asset info + recent sensor history.
    """
    asset = Asset.query.get(asset_id)
    if not asset:
        return jsonify({"error": "Asset not found"}), 404
        
    # Recent sensors (last 100 points)
    sensors = SensorData.query.filter_by(asset_id=asset_id).order_by(SensorData.timestamp.desc()).limit(100).all()
    sensor_data = [s.to_dict() for s in sensors]
    # Reverse to be chronological for charts
    sensor_data.reverse()
    
    # Latest Risk
    latest_risk = RiskAssessment.query.filter_by(asset_id=asset_id).order_by(RiskAssessment.timestamp.desc()).first()
    explainability = None
    if latest_risk and latest_risk.notes:
        try:
            explainability = json.loads(latest_risk.notes)
        except Exception:
            explainability = None

    inspections = InspectionRecord.query.filter_by(asset_id=asset_id).order_by(InspectionRecord.timestamp.desc()).all()
    inspection_data = [i.to_dict() for i in inspections]
    
    return jsonify({
        "asset": asset.to_dict(),
        "history": sensor_data,
        "risk": latest_risk.to_dict() if latest_risk else None,
        "explainability": explainability,
        "inspections": inspection_data
    })
