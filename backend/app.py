from flask import Flask
from flask_cors import CORS
from .config import Config
from .models.shared import db
# Import models to ensure they are registered with SQLAlchemy
from .models.asset import Asset
from .models.sensor import SensorData
from .models.inspection import InspectionRecord
from .models.risk import RiskAssessment

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app)
    db.init_app(app)
    
    # Register Blueprints
    from .routes.ingestion import ingestion_bp
    from .routes.analysis import analysis_bp
    
    app.register_blueprint(ingestion_bp, url_prefix='/api/ingest')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    
    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        # db.create_all() # For dev only, usually use migrations
        pass
    app.run(debug=True, port=5000)
