from .shared import db
from datetime import datetime

class InspectionRecord(db.Model):
    __tablename__ = 'inspection_records'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    inspector = db.Column(db.String(100))
    finding = db.Column(db.String(255)) # "Wall thickness 11.2mm"
    severity = db.Column(db.String(20)) # "Low", "Critical"
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "inspector": self.inspector,
            "finding": self.finding,
            "severity": self.severity
        }
