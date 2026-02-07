import pandas as pd
from ..models.risk import RiskAssessment
from ..models.asset_graph import AssetEdge
from ..models.shared import db

class AnalysisEngine:
    def __init__(self):
        # In a real app, load models from disk
        self.models = {} 

    def train_anomaly_model(self, data, features):
        """
        Mock training of an IsolationForest or similar.
        """
        pass

    def calculate_degradation_score(self, data, features):
        """
        Returns a mock risk score between 0.0 and 1.0
        """
        # Simple logic: higher values = higher risk
        if data.empty:
            return []
            
        # Mock: normalize the first feature to 0-1 range roughly
        vals = data[features[0]].values
        # simple min-max mock
        scores = [(min(abs(x)/100.0, 1.0)) for x in vals]
        return scores

    def propagate_failure_risk(self, start_asset_id, initial_risk):
        """
        Propagates risk downstream using the Asset Graph.
        Returns a dict of {asset_id: propagated_risk_score}
        """
        impact_scores = {start_asset_id: initial_risk}
        queue = [(start_asset_id, initial_risk)]
        
        visited = set()
        
        while queue:
            current_id, current_risk = queue.pop(0)
            
            if current_id in visited:
                continue
            visited.add(current_id)
            
            # Find downstream neighbors
            edges = AssetEdge.query.filter_by(source_id=current_id).all()
            
            for edge in edges:
                # Decay risk slightly over distance/hops
                decay_factor = 0.8 * edge.weight
                propagated_risk = current_risk * decay_factor
                
                # If significant risk, add to queue
                if propagated_risk > 0.1:
                    # Accumulate risk if multiple sources (simple max for now)
                    existing = impact_scores.get(edge.target_id, 0.0)
                    impact_scores[edge.target_id] = max(existing, propagated_risk)
                    queue.append((edge.target_id, propagated_risk))
                    
        return impact_scores
