from .shared import db
from datetime import datetime

class Asset(db.Model):
    __tablename__ = 'assets'

    id = db.Column(db.String(50), primary_key=True) # e.g., "PV-101"
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False) # "Pressure Vessel", "Pump"
    location = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sensors = db.relationship('SensorData', backref='asset', lazy=True)
    inspections = db.relationship('InspectionRecord', backref='asset', lazy=True)
    risks = db.relationship('RiskAssessment', backref='asset', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "location": self.location
        }
