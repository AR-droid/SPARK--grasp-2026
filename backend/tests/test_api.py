import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import unittest
import json
from io import BytesIO
from backend.app import create_app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app.config['TESTING'] = True

    def test_analysis_endpoint(self):
        print("\nTesting Analysis Endpoint...")
        # Simulate data payload
        payload = {
            "asset_id": "TEST-PUMP",
            "asset_type": "rotating_equipment",
            "sensor_data": [
                {"timestamp": "2023-01-01T10:00:00", "value": 10},
                {"timestamp": "2023-01-01T10:01:00", "value": 11},
                {"timestamp": "2023-01-01T10:02:00", "value": 10},
                {"timestamp": "2023-01-01T10:03:00", "value": 50}, # Anomaly
                {"timestamp": "2023-01-01T10:04:00", "value": 55}  # Anomaly
            ]
        }
        
        response = self.client.post('/api/analysis/run_diagnosis', 
                                    data=json.dumps(payload),
                                    content_type='application/json')
        
        data = response.get_json()
        print("Analysis Response:", data)
        
        self.assertEqual(response.status_code, 200)
        self.assertIn("risk_score", data)
        self.assertIn("diagnosis", data)
        # Should detect anomaly/risk > 0
        self.assertGreater(data['risk_score'], 0.1)
        print("✅ Analysis API passed.")

    def test_ingestion_endpoint(self):
        print("\nTesting Ingestion Endpoint...")
        # Create a mock CSV
        csv_content = b"timestamp,value,unit\n2023-01-01 10:00,10,psi\n2023-01-01 10:01,12,psi"
        data = {
            'file': (BytesIO(csv_content), 'test.csv'),
            'asset_id': 'TEST-VESSEL',
            'type': 'sensor'
        }
        
        response = self.client.post('/api/ingest/upload_csv', 
                                    data=data,
                                    content_type='multipart/form-data')
        
        data = response.get_json()
        print("Ingestion Response:", data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['message'], "Ingestion Successful")
        print("✅ Ingestion API passed.")

if __name__ == '__main__':
    unittest.main()
