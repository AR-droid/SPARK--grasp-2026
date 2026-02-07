from .shared import db
from datetime import datetime

class ActionItem(db.Model):
    __tablename__ = 'action_items'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    risk_assessment_id = db.Column(db.Integer, db.ForeignKey('risk_assessments.id'), nullable=True)

    recommendation = db.Column(db.String(50), nullable=False)  # REPAIR / MONITOR / DEFER
    status = db.Column(db.String(20), default='OPEN')  # OPEN / APPROVED / REJECTED / COMPLETED
    approved_action = db.Column(db.String(50))  # REPAIR / MONITOR / DEFER
    approved_by = db.Column(db.String(100))

    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "project_id": self.project_id,
            "risk_assessment_id": self.risk_assessment_id,
            "recommendation": self.recommendation,
            "status": self.status,
            "approved_action": self.approved_action,
            "approved_by": self.approved_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
