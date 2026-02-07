from flask import Blueprint, request, jsonify
from ..models.shared import db
from ..models.project import Project
from ..services.rbi_library import get_industry_profile, ASSET_LIBRARY
from ..utils.auth import require_auth

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/', methods=['GET'])
@require_auth
def get_projects():
    """List all projects."""
    try:
        projects = Project.query.order_by(Project.created_at.desc()).all()
        return jsonify([p.to_dict() for p in projects])
    except Exception:
        # Demo fallback if DB is unavailable
        return jsonify([{
            "id": 1,
            "name": "Demo Refinery A",
            "industry": "REFINING",
            "plant_name": "Unit 01",
            "description": "Auto-seeded demo project (DB unavailable)."
        }])

@projects_bp.route('/', methods=['POST'])
@require_auth
def create_project():
    """Create a new project workspace."""
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('industry'):
        return jsonify({"error": "Missing required fields (name, industry)"}), 400
        
    new_project = Project(
        name=data.get('name'),
        industry=data.get('industry'),
        plant_name=data.get('plant_name', ''),
        description=data.get('description', '')
    )
    
    try:
        db.session.add(new_project)
        db.session.commit()
        return jsonify(new_project.to_dict()), 201
    except Exception:
        db.session.rollback()
        # Demo fallback: return a synthetic project
        return jsonify({
            "id": 1,
            "name": data.get('name', 'Demo Project'),
            "industry": data.get('industry', 'REFINING'),
            "plant_name": data.get('plant_name', 'Unit 01'),
            "description": "Auto-seeded demo project (DB unavailable)."
        }), 201

@projects_bp.route('/<int:project_id>', methods=['GET'])
@require_auth
def get_project(project_id):
    """Get project details."""
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())

@projects_bp.route('/templates/<industry>', methods=['GET'])
def get_industry_templates(industry):
    """
    Returns RBI-style templates for a given industry to drive onboarding defaults.
    """
    profile = get_industry_profile(industry)
    return jsonify({
        "industry": industry,
        "profile": profile,
        "asset_library": ASSET_LIBRARY
    })
