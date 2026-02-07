import os
import pandas as pd
from backend.config import Config
from backend.models.shared import db
from backend.models.project import Project
from backend.models.asset import Asset
from backend.models.sensor import SensorData
from backend.models.inspection import InspectionRecord
from backend.models.risk import RiskAssessment
from backend.models.action import ActionItem
try:
    from backend.services.ml_pipeline import MLPipeline
except Exception:
    MLPipeline = None
from flask import Flask

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')

ASSET_REGISTRY = os.path.join(DATA_DIR, 'shared', 'metadata', 'asset_registry.csv')

SENSOR_MAP = {
    'pressure_vessels': ['pressure', 'temperature', 'pressure_cycles'],
    'heat_exchangers': ['pressure_drop', 'inlet_temperature', 'outlet_temperature', 'flow_rate'],
    'storage_tanks': ['level_data', 'internal_pressure', 'temperature'],
    'piping_networks': ['pressure', 'pressure_drop', 'flow_rate'],
    'rotating_equipment': ['vibration', 'temperature', 'load', 'rpm']
}

ASSET_TYPE_MAP = {
    'Pressure Vessel': 'pressure_vessels',
    'Heat Exchanger': 'heat_exchangers',
    'Storage Tank': 'storage_tanks',
    'Piping': 'piping_networks',
    'Rotating Equipment': 'rotating_equipment'
}


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app


def seed():
    app = create_app()
    ml = MLPipeline() if MLPipeline else None

    with app.app_context():
        # Clear existing data
        ActionItem.query.delete()
        RiskAssessment.query.delete()
        SensorData.query.delete()
        Asset.query.delete()
        Project.query.delete()
        db.session.commit()

        project = Project(
            name='SPARK Pilot',
            industry='Refining',
            plant_name='Unit 2',
            description='Seeded pilot project'
        )
        db.session.add(project)
        db.session.commit()

        registry = pd.read_csv(ASSET_REGISTRY)
        for _, row in registry.iterrows():
            asset = Asset(
                id=row['asset_id'],
                name=row['asset_id'],
                type=row['type'],
                location=row['location'],
                project_id=project.id
            )
            db.session.add(asset)
        db.session.commit()

        # Seed sensor data and run ML per asset/metric
        for _, row in registry.iterrows():
            asset_id = row['asset_id']
            asset_type = row['type']
            dataset_key = ASSET_TYPE_MAP.get(asset_type)
            if not dataset_key:
                continue

            metrics = SENSOR_MAP.get(dataset_key, [])
            for metric in metrics:
                file_path = os.path.join(DATA_DIR, dataset_key, 'sensor_timeseries', f'{metric}.csv')
                if not os.path.exists(file_path):
                    continue
                df = pd.read_csv(file_path)
                # time in seconds
                for _, s in df.iterrows():
                    ts = pd.to_datetime(s['time'], unit='s', origin=pd.Timestamp.utcnow())
                    rec = SensorData(
                        asset_id=asset_id,
                        timestamp=ts,
                        type=metric,
                        value=float(s['value']),
                        unit=s.get('unit', '')
                    )
                    db.session.add(rec)
                db.session.commit()
                if ml:
                    ml.run_for_asset_metric(project.id, asset_id, metric)

        if not ml:
            print('Seed complete (ML pipeline unavailable in this runtime).')
        else:
            print('Seed complete')


if __name__ == '__main__':
    seed()
