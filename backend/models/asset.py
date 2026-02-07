from .shared import db
from datetime import datetime
import json

class Asset(db.Model):
    __tablename__ = 'assets'

    id = db.Column(db.String(50), primary_key=True) # e.g., "PV-101"
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False) # "Pressure Vessel", "Pump"
    location = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True) # key change for project isolation
    metadata_json = db.Column(db.Text, nullable=True)
    
    # Relationships
    sensors = db.relationship('SensorData', backref='asset', lazy=True)
    inspections = db.relationship('InspectionRecord', backref='asset', lazy=True)
    risks = db.relationship('RiskAssessment', backref='asset', lazy=True)

    def to_dict(self):
        metadata = None
        if self.metadata_json:
            try:
                metadata = json.loads(self.metadata_json)
            except Exception:
                metadata = None
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "location": self.location,
            "project_id": self.project_id,
            "metadata": metadata
        }
