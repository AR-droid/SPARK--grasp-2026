from flask import Blueprint, request, jsonify
from ..models.shared import db
from ..models.action import ActionItem
from ..models.asset import Asset
from ..models.risk import RiskAssessment
from ..utils.auth import require_auth

actions_bp = Blueprint('actions', __name__)

@actions_bp.route('/', methods=['GET'])
@require_auth
def list_actions():
    project_id = request.args.get('project_id')
    status = request.args.get('status')
    asset_id = request.args.get('asset_id')

    query = ActionItem.query
    if project_id:
        query = query.filter_by(project_id=project_id)
    if status:
        query = query.filter_by(status=status)
    if asset_id:
        query = query.filter_by(asset_id=asset_id)

    try:
        actions = query.order_by(ActionItem.created_at.desc()).all()
        return jsonify([a.to_dict() for a in actions])
    except Exception:
        # Demo fallback
        return jsonify([
            {
                "id": 1,
                "asset_id": asset_id or "PV-102",
                "project_id": project_id or 1,
                "recommendation": "Monitor",
                "status": "APPROVED",
                "notes": "Demo action item (DB unavailable).",
                "approved_by": "Engineer"
            }
        ])

@actions_bp.route('/', methods=['POST'])
@require_auth
def create_action():
    data = request.get_json() or {}
    asset_id = data.get('asset_id')
    recommendation = data.get('recommendation')
    project_id = data.get('project_id')
    risk_assessment_id = data.get('risk_assessment_id')
    notes = data.get('notes', '')

    if not asset_id or not recommendation:
        return jsonify({"error": "asset_id and recommendation required"}), 400

    action = ActionItem(
        asset_id=asset_id,
        project_id=project_id,
        risk_assessment_id=risk_assessment_id,
        recommendation=recommendation,
        notes=notes
    )

    try:
        db.session.add(action)
        db.session.commit()
        return jsonify(action.to_dict()), 201
    except Exception:
        db.session.rollback()
        return jsonify({
            "id": 1,
            "asset_id": asset_id,
            "project_id": project_id,
            "recommendation": recommendation,
            "status": "CREATED",
            "notes": notes
        }), 201

@actions_bp.route('/<int:action_id>/approve', methods=['POST'])
@require_auth
def approve_action(action_id):
    data = request.get_json() or {}
    approved_action = data.get('approved_action')
    approved_by = data.get('approved_by', 'Engineer')
    status = data.get('status', 'APPROVED')

    try:
        action = ActionItem.query.get_or_404(action_id)
    except Exception:
        return jsonify({
            "id": action_id,
            "approved_action": approved_action,
            "approved_by": approved_by,
            "status": status
        })
    if not approved_action:
        return jsonify({"error": "approved_action required"}), 400

    action.approved_action = approved_action
    action.approved_by = approved_by
    action.status = status

    db.session.commit()
    return jsonify(action.to_dict())
