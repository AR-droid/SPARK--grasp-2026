from flask import Blueprint, jsonify, request
import json
from ..models.shared import db
from ..models.asset import Asset
from ..models.twin_component import TwinComponent
from ..utils.auth import require_auth

twin_bp = Blueprint('twin', __name__)

DEFAULT_COMPONENTS = {
    "pressure vessel": [
        ("pv_shell", "shell", ["corrosion", "fatigue"], ["pressure", "temperature", "audio"], ["shell_zone"]),
        ("pv_nozzle_inlet", "nozzle_inlet", ["erosion"], ["flow_rate", "audio"], ["nozzle_inlet"]),
        ("pv_nozzle_outlet", "nozzle_outlet", ["erosion"], ["flow_rate", "audio"], ["nozzle_outlet"]),
        ("pv_weld_seam", "weld_seam", ["cracking"], ["pressure_cycles", "audio"], ["weld_zone"]),
        ("pv_support", "support", ["fatigue"], ["vibration", "audio"], ["support"]),
    ],
    "heat exchanger": [
        ("hx_shell", "shell", ["corrosion"], ["pressure", "temperature", "audio"], ["shell_zone"]),
        ("hx_tube_bundle", "tube_bundle", ["fouling", "corrosion"], ["temperature_delta", "flow_rate", "audio"], ["tube_sheet"]),
        ("hx_tube_sheet", "tube_sheet", ["cracking"], ["temperature_delta", "audio"], ["tube_sheet"]),
        ("hx_nozzle_inlet", "nozzle_inlet", ["erosion"], ["flow_rate", "audio"], ["nozzle_inlet"]),
        ("hx_nozzle_outlet", "nozzle_outlet", ["erosion"], ["flow_rate", "audio"], ["nozzle_outlet"]),
    ],
    "storage tank": [
        ("tank_shell", "shell", ["corrosion"], ["pressure"], ["shell"]),
        ("tank_bottom", "bottom", ["corrosion"], ["thickness"], ["bottom_plate"]),
        ("tank_roof", "roof", ["leak"], ["pressure"], ["roof"]),
        ("tank_nozzle", "nozzle", ["leak"], ["flow_rate"], ["nozzle"]),
    ],
    "piping": [
        ("pipe_main", "pipe_main", ["corrosion", "leak"], ["pressure", "flow_rate"], ["pipe_run"]),
        ("pipe_elbow", "elbow", ["erosion"], ["flow_rate"], ["elbow"]),
        ("pipe_flange", "flange", ["leak"], ["pressure"], ["flange"]),
    ],
    "pump": [
        ("pump_impeller", "impeller", ["cavitation"], ["vibration", "flow_rate", "audio"], ["impeller"]),
        ("pump_bearing_de", "bearing_de", ["bearing_wear"], ["vibration", "temperature", "audio"], ["bearing_de"]),
        ("pump_bearing_nde", "bearing_nde", ["bearing_wear"], ["vibration", "temperature", "audio"], ["bearing_nde"]),
        ("pump_shaft", "shaft", ["misalignment"], ["vibration", "audio"], ["shaft"]),
        ("pump_seal", "seal", ["leak"], ["pressure"], ["seal"]),
    ],
    "motor": [
        ("motor_bearing_de", "bearing_de", ["bearing_wear"], ["vibration", "temperature", "audio"], ["bearing_de"]),
        ("motor_bearing_nde", "bearing_nde", ["bearing_wear"], ["vibration", "temperature", "audio"], ["bearing_nde"]),
        ("motor_rotor", "rotor", ["imbalance"], ["vibration", "audio"], ["rotor"]),
    ],
    "compressor": [
        ("comp_valve", "valve", ["fatigue"], ["pressure", "temperature"], ["valve"]),
        ("comp_bearing", "bearing", ["bearing_wear"], ["vibration", "temperature", "audio"], ["bearing"]),
        ("comp_shaft", "shaft", ["misalignment"], ["vibration", "audio"], ["shaft"]),
    ],
}

def _match_asset_type(asset_type):
    t = (asset_type or "").lower()
    for key in DEFAULT_COMPONENTS.keys():
        if key in t:
            return key
    return None

@twin_bp.route('/components/<asset_id>', methods=['GET'])
@require_auth
def list_components(asset_id):
    components = TwinComponent.query.filter_by(asset_id=asset_id).all()
    return jsonify([c.to_dict() for c in components])

@twin_bp.route('/components/seed', methods=['POST'])
@require_auth
def seed_components():
    data = request.get_json() or {}
    asset_id = data.get('asset_id')
    if not asset_id:
        return jsonify({"error": "asset_id required"}), 400
    asset = Asset.query.get(asset_id)
    if not asset:
        return jsonify({"error": "Asset not found"}), 404

    existing = TwinComponent.query.filter_by(asset_id=asset_id).first()
    if existing:
        return jsonify({"message": "Components already seeded"}), 200

    key = _match_asset_type(asset.type)
    if not key:
        return jsonify({"error": "No default mapping for asset type"}), 400

    created = 0
    for mesh_name, component, failure_modes, metrics, inspection_points in DEFAULT_COMPONENTS[key]:
        comp = TwinComponent(
            asset_id=asset_id,
            mesh_name=mesh_name,
            component=component,
            failure_modes_json=json.dumps(failure_modes),
            metrics_json=json.dumps(metrics),
            inspection_points_json=json.dumps(inspection_points)
        )
        db.session.add(comp)
        created += 1
    db.session.commit()

    return jsonify({"message": "Seeded components", "count": created}), 201
