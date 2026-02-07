from flask import Flask
from flask_cors import CORS
from .config import Config
from .models.shared import db
# Import models to ensure they are registered with SQLAlchemy
from .models.asset import Asset
from .models.sensor import SensorData
from .models.inspection import InspectionRecord
from .models.risk import RiskAssessment
from .models.action import ActionItem
from .models.twin_component import TwinComponent
from .models.user import User
from .utils.db_init import init_core_tables, seed_demo_data

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app)
    db.init_app(app)

    with app.app_context():
        try:
            init_core_tables()
            seed_demo_data()
        except Exception:
            db.session.rollback()
    
    # Register Blueprints
    from .routes.ingestion import ingestion_bp
    from .routes.analysis import analysis_bp
    
    app.register_blueprint(ingestion_bp, url_prefix='/api/ingest')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    
    from .routes.assets import assets_bp
    app.register_blueprint(assets_bp, url_prefix='/api/assets')

    from .routes.projects import projects_bp
    app.register_blueprint(projects_bp, url_prefix='/api/projects')

    from .routes.actions import actions_bp
    app.register_blueprint(actions_bp, url_prefix='/api/actions')

    from .routes.reports import reports_bp
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from .routes.twin import twin_bp
    app.register_blueprint(twin_bp, url_prefix='/api/twin')
    
    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        # db.create_all() # For dev only, usually use migrations
        pass
    app.run(debug=True, port=5001)
