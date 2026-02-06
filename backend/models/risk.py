from .shared import db
from datetime import datetime

class RiskAssessment(db.Model):
    __tablename__ = 'risk_assessments'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    risk_score = db.Column(db.Float, nullable=False) # 0.0 - 1.0
    degradation_type = db.Column(db.String(100)) # "Bearing Wear", "Corrosion"
    confidence_score = db.Column(db.Float) # 0.0 - 1.0
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "risk_score": self.risk_score,
            "degradation_type": self.degradation_type,
            "confidence": self.confidence_score
        }
