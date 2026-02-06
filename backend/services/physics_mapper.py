import pandas as pd

class PhysicsMapper:
    def __init__(self):
        pass

    def map_failure_mode(self, asset_type: str, anomalies: list, recent_features: dict):
        """
        Maps anomalies and feature values to specific failure modes.
        Returns a dict of {Mode: Probability/Confidence}.
        """
        diagnoses = {}
        
        # 1. Rotating Equipment Logic
        if asset_type in ["rotating_equipment", "pump", "motor"]:
            vib_mean = recent_features.get("vibration_roll_mean", 0)
            temp_mean = recent_features.get("temperature_roll_mean", 0)
            
            # Rule: High Vibration + High Temp -> Bearing Wear
            if vib_mean > 20 and temp_mean > 80: # Arbitrary thresholds for prototype
                diagnoses["Bearing Wear"] = 0.9
            elif vib_mean > 20:
                diagnoses["Unbalance / Misalignment"] = 0.7
                
            # Rule: High Temp only -> Lubrication issue
            elif temp_mean > 90:
                diagnoses["Lubrication Failure"] = 0.8

        # 2. Piping / Pressure Vessel Logic
        elif asset_type in ["piping_networks", "pressure_vessels", "tank"]:
            pressure_drop = recent_features.get("pressure_drop_roll_mean", 0)
            acoustic = recent_features.get("audio_rms", 0) # Placeholder
            
            # Rule: Pressure Drop + Acoustic signal -> Leak
            if pressure_drop > 5: # Significant drop
                diagnoses["Leak Detection"] = 0.85
                
            # Rule: Wall thickness low (if available from inspection)
            # Currently just sensor features passed here, but could expand.
            
        # 3. Generic logic
        if not diagnoses and anomalies:
            diagnoses["Unknown Anomaly"] = 0.5
            
        return diagnoses

    def interpret_risk(self, risk_score, failure_modes):
        """
        Generates a human-readable summary.
        """
        if risk_score < 0.3:
            return "Asset is Healthy."
            
        top_mode = "Unknown"
        if failure_modes:
            top_mode = max(failure_modes, key=failure_modes.get)
            
        return f"High Risk ({risk_score:.2f}). Suspected: {top_mode}."
