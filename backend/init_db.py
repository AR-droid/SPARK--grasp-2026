from app import create_app, db
from models.asset import Asset, AssetRisk
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Create tables
    db.create_all()
    print("Database tables created.")

    # Check if we need to seed
    if Asset.query.count() == 0:
        print("Seeding initial data...")
        
        # Create some sample assets matching the design
        assets = [
            Asset(name="Pump A-101", type="Rotating Equipment", location="Unit 1"),
            Asset(name="Vessel V-202", type="Pressure Vessel", location="Unit 2"),
            Asset(name="Exchanger E-303", type="Heat Exchanger", location="Unit 1"),
            Asset(name="Tank T-404", type="Storage Tank", location="Farm A"),
            Asset(name="Piping P-505", type="Piping", location="Corridor B"),
        ]
        
        db.session.add_all(assets)
        db.session.commit()
        
        # Add some initial risk assessments
        risks = [
            AssetRisk(asset_id=assets[0].id, risk_score=85.0, risk_level="High", failure_mode="Bearing Wear", recommendation="Inspect immediately"),
            AssetRisk(asset_id=assets[1].id, risk_score=45.0, risk_level="Medium", failure_mode="Corrosion", recommendation="Monitor wall thickness"),
            AssetRisk(asset_id=assets[2].id, risk_score=12.0, risk_level="Low", failure_mode="None", recommendation="Routine maintenance"),
            AssetRisk(asset_id=assets[3].id, risk_score=25.0, risk_level="Low", failure_mode="None", recommendation="Routine maintenance"),
            AssetRisk(asset_id=assets[4].id, risk_score=78.0, risk_level="High", failure_mode="Leak", recommendation="Check flange bolts"),
        ]
        
        db.session.add_all(risks)
        db.session.commit()
        print("Seeding complete.")
    else:
        print("Database already contains data.")
