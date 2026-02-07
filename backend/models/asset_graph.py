from .shared import db

class AssetNode(db.Model):
    __tablename__ = 'asset_nodes'
    # Simply linking to the main Asset table, but simpler for graph queries if needed
    asset_id = db.Column(db.String(50), db.ForeignKey('assets.id'), primary_key=True)
    
class AssetEdge(db.Model):
    __tablename__ = 'asset_edges'
    
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    target_id = db.Column(db.String(50), db.ForeignKey('assets.id'), nullable=False)
    relationship_type = db.Column(db.String(50)) # e.g., "feeds", "controls", "powers"
    weight = db.Column(db.Float, default=1.0) # Influence weight

    def to_dict(self):
        return {
            "source": self.source_id,
            "target": self.target_id,
            "type": self.relationship_type,
            "weight": self.weight
        }
