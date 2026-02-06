from .shared import db
from datetime import datetime

class SensorData(db.Model):
    __tablename__ = 'sensor_data'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False) # "Vibration", "Pressure"
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20))
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "type": self.type,
            "value": self.value,
            "unit": self.unit
        }
