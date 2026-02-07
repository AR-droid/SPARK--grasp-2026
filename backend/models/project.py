from .shared import db
from datetime import datetime

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    industry = db.Column(db.String(50), nullable=False) # "Chemical", "Refining", "Energy"
    plant_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Context specific fields
    # We might want to link assets to a project later, but for now let's keep it simple.
    # assets = db.relationship('Asset', backref='project', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "industry": self.industry,
            "plant_name": self.plant_name,
            "description": self.description,
            "created_at": self.created_at.isoformat()
        }
