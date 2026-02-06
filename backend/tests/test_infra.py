import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import numpy as np
from backend.models.asset import Asset
from backend.models.sensor import SensorData
from backend.models.inspection import InspectionRecord
from backend.models.risk import RiskAssessment
from backend.services.data_quality_service import DataQualityService

def test_imports():
    print("✅ Models imported successfully.")

def test_data_quality():
    dq = DataQualityService()
    
    # Test Sensor Validation
    df_sensor = pd.DataFrame({
        "timestamp": pd.date_range(start='1/1/2023', periods=10, freq='1min'),
        "value": [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] # Zero variance
    })
    # Add a gap
    df_sensor.at[5, 'timestamp'] = pd.Timestamp('1/1/2023 01:00:00') # 1 hour gap
    
    report_sensor = dq.validate_sensor_data(df_sensor)
    print("Values Check:", report_sensor)
    assert "Sensor frozen: value" in report_sensor['flags']
    assert any("Sensor gaps" in f for f in report_sensor['flags'])
    
    # Test Inspection Validation (Stale)
    df_insp = pd.DataFrame({
        "date": [pd.Timestamp('2020-01-01')],
        "finding": ["Ok"]
    })
    report_insp = dq.validate_inspection_data(df_insp)
    print("Inspection Check:", report_insp)
    assert any("Stale inspection" in f for f in report_insp['flags'])
    
    print("✅ Data Quality Service verified.")

if __name__ == "__main__":
    test_imports()
    test_data_quality()
