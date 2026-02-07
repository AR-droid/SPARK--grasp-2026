from sqlalchemy import text
from ..models.shared import db
from ..models.project import Project
from ..models.asset import Asset
from ..models.sensor import SensorData
from ..models.risk import RiskAssessment
from ..models.inspection import InspectionRecord
import os
import pandas as pd
from datetime import datetime, timedelta

def init_core_tables():
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """))
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS twin_components (
            id BIGSERIAL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES assets(id),
            mesh_name TEXT NOT NULL,
            component TEXT NOT NULL,
            failure_modes_json TEXT,
            metrics_json TEXT,
            inspection_points_json TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """))
    db.session.commit()

def seed_demo_data():
    # Create a demo project if none exists
    demo = Project.query.filter_by(name="Demo Refinery A").first()
    if not demo:
        demo = Project(name="Demo Refinery A", industry="Refining", plant_name="Unit 01", description="Demo seed project")
        db.session.add(demo)
        db.session.commit()

    # Create a demo asset
    asset = Asset.query.get("PV-102")
    if not asset:
        asset = Asset(
            id="PV-102",
            name="Pressure Vessel",
            type="Pressure Vessel",
            location="Unit 1",
            project_id=demo.id,
            metadata_json='{"design_pressure":{"value":150,"unit":"psi"},"design_temperature":{"value":320,"unit":"°C"},"valve_setpoint":{"value":180,"unit":"psi"},"_context":{"source":"seed","extracted_at":"seed"}}'
        )
        db.session.add(asset)
        db.session.commit()

    # Seed sensor data if empty
    existing = SensorData.query.filter_by(asset_id="PV-102").first()
    if not existing:
        data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'pressure_vessels', 'sensor_timeseries', 'pressure.csv')
        if os.path.exists(data_dir):
            df = pd.read_csv(data_dir)
            if 'time' not in df.columns:
                df['time'] = range(len(df))
            base_time = datetime.utcnow() - timedelta(seconds=float(df['time'].max()))
            records = []
            for _, row in df.iterrows():
                ts = base_time + timedelta(seconds=float(row['time']))
                records.append(SensorData(
                    asset_id="PV-102",
                    timestamp=ts,
                    type="pressure",
                    value=float(row.get('value', 0.0)),
                    unit=row.get('unit', 'psi') or 'psi'
                ))
            db.session.bulk_save_objects(records)
            db.session.commit()

    # Seed one inspection record if none
    if not InspectionRecord.query.filter_by(asset_id="PV-102").first():
        insp = InspectionRecord(
            asset_id="PV-102",
            timestamp=datetime.utcnow() - timedelta(days=60),
            inspector="Seed Inspector",
            finding="Wall thinning observed near weld seam",
            severity="Medium"
        )
        db.session.add(insp)
        db.session.commit()

    # Seed a risk assessment if none
    if not RiskAssessment.query.filter_by(asset_id="PV-102").first():
        risk = RiskAssessment(
            asset_id="PV-102",
            risk_score=0.49,
            degradation_type="Overpressure rupture",
            confidence_score=0.78,
            notes='{"signals":["pressure"],"rationale":"Pressure rising beyond baseline","failure_mode":"overpressure"}'
        )
        db.session.add(risk)
        db.session.commit()
