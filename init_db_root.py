
import sys
import os

# Add the parent directory to sys.path so we can import 'backend'
sys.path.append(os.getcwd())

from backend.app import create_app, db
from backend.models.asset import Asset
from backend.models.risk import RiskAssessment
from backend.models.project import Project
from backend.models.asset_graph import AssetNode, AssetEdge

app = create_app()

with app.app_context():
    # 1. Ensure tables exist
    db.create_all()
    print("Database tables created.")

    # 2. Seed Project
    if Project.query.count() == 0:
        default_project = Project(name="Demo Refinery A", industry="Refining", plant_name="Unit 01", description="Main Crude Unit")
        db.session.add(default_project)
        db.session.commit()
        print("Seeded default project.")

    # 3. Seed Assets
    if Asset.query.count() == 0:
        # Get the default project we just seeded
        default_proj = Project.query.filter_by(name="Demo Refinery A").first()
        p_id = default_proj.id if default_proj else None
        
        assets = [
            Asset(id="PV-101", name="Pump A-101", type="Rotating Equipment", location="Unit 1", project_id=p_id),
            Asset(id="V-202", name="Vessel V-202", type="Pressure Vessel", location="Unit 2", project_id=p_id),
            Asset(id="E-303", name="Exchanger E-303", type="Heat Exchanger", location="Unit 1", project_id=p_id),
            Asset(id="T-404", name="Tank T-404", type="Storage Tank", location="Farm A", project_id=p_id),
            Asset(id="P-505", name="Piping P-505", type="Piping", location="Corridor B", project_id=p_id),
        ]
        
        db.session.add_all(assets)
        db.session.commit()

    # 4. Seed Risks
    if RiskAssessment.query.count() == 0:
        risks_corrected = [
            RiskAssessment(asset_id="PV-101", risk_score=0.85, degradation_type="Bearing Wear", confidence_score=0.9, notes="Inspect immediately. High vibration detected."),
            RiskAssessment(asset_id="V-202", risk_score=0.45, degradation_type="Corrosion", confidence_score=0.7, notes="Monitor wall thickness. Drift observed."),
            RiskAssessment(asset_id="E-303", risk_score=0.12, degradation_type="None", confidence_score=0.95, notes="Normal operation."),
            RiskAssessment(asset_id="T-404", risk_score=0.25, degradation_type="None", confidence_score=0.8, notes="Minor fluctuations."),
            RiskAssessment(asset_id="P-505", risk_score=0.78, degradation_type="Leak", confidence_score=0.85, notes="Check flange bolts. Pressure drop detected."),
        ]
        db.session.add_all(risks_corrected)
        db.session.commit()

    # 5. Seed Asset Graph (Connectivity)
    if AssetEdge.query.count() == 0:
        edges = [
            AssetEdge(source_id="PV-101", target_id="V-202", relationship_type="feeds", weight=1.0),
            AssetEdge(source_id="V-202", target_id="E-303", relationship_type="feeds", weight=0.9),
            AssetEdge(source_id="E-303", target_id="T-404", relationship_type="outputs_to", weight=0.8),
            AssetEdge(source_id="P-505", target_id="PV-101", relationship_type="supplies", weight=1.0)
        ]
        db.session.add_all(edges)
        db.session.commit()
        print("Seeded asset graph connections.")
        
    print("Seeding complete.")
