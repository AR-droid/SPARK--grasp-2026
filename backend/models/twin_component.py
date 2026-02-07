from .shared import db
from datetime import datetime
import json

class TwinComponent(db.Model):
    __tablename__ = 'twin_components'

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    mesh_name = db.Column(db.String(120), nullable=False)
    component = db.Column(db.String(120), nullable=False)
    failure_modes_json = db.Column(db.Text, nullable=True)
    metrics_json = db.Column(db.Text, nullable=True)
    inspection_points_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        def _loads(value):
            if not value:
                return []
            try:
                return json.loads(value)
            except Exception:
                return []
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "mesh_name": self.mesh_name,
            "component": self.component,
            "failure_modes": _loads(self.failure_modes_json),
            "metrics": _loads(self.metrics_json),
            "inspection_points": _loads(self.inspection_points_json),
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }
