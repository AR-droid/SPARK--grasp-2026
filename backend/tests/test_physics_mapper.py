import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.services.physics_mapper import PhysicsMapper

def test_physics_mapper():
    pm = PhysicsMapper()
    
    # Test 1: Pump with High Vib & Temp
    features_pump = {
        "vibration_roll_mean": 25.0, # High
        "temperature_roll_mean": 85.0 # High
    }
    
    diagnosis = pm.map_failure_mode("rotating_equipment", ["vibration"], features_pump)
    print("Pump Diagnosis:", diagnosis)
    
    assert "Bearing Wear" in diagnosis
    assert diagnosis["Bearing Wear"] > 0.8
    print("✅ Pump Logic passed.")
    
    # Test 2: Piping Leak
    features_pipe = {
        "pressure_drop_roll_mean": 10.0 # High drop
    }
    
    diagnosis_pipe = pm.map_failure_mode("piping_networks", [], features_pipe)
    print("Pipe Diagnosis:", diagnosis_pipe)
    
    assert "Leak Detection" in diagnosis_pipe
    print("✅ Pipe Logic passed.")
    
    # Test 3: Interpretation
    msg = pm.interpret_risk(0.8, diagnosis)
    print("Interpretation:", msg)
    assert "Suspected: Bearing Wear" in msg
    print("✅ Interpretation passed.")

if __name__ == "__main__":
    test_physics_mapper()
