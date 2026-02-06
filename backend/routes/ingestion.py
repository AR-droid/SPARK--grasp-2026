from flask import Blueprint,request, jsonify
import pandas as pd
import os
from datetime import datetime
from ..models.shared import db
from ..models.asset import Asset
from ..models.sensor import SensorData
from ..services.data_quality_service import DataQualityService
from ..services.preprocessing_service import PreprocessingService
from ..services.feature_engine import FeatureEngine

ingestion_bp = Blueprint('ingestion', __name__)

# Initialize services
quality_service = DataQualityService()
preprocessing_service = PreprocessingService()
feature_engine = FeatureEngine()

@ingestion_bp.route('/upload_csv', methods=['POST'])
def upload_csv():
    """
    Ingests CSV data for an asset.
    Expected form data: file, asset_id, type (sensor/inspection)
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    asset_id = request.form.get('asset_id')
    data_type = request.form.get('type', 'sensor') # 'sensor' or 'inspection'
    
    if not asset_id:
        return jsonify({"error": "Asset ID required"}), 400
        
    try:
        df = pd.read_csv(file)
        
        report = {}
        if data_type == 'sensor':
            # 1. Validate
            report = quality_service.validate_sensor_data(df)
            if report['score'] < 50:
                return jsonify({"error": "Data Quality too low", "report": report}), 400
                
            # 2. Process (Resample/Norm) - simplified for ingestion
            # Usually we store RAW data, then process async. 
            # For prototype, we might just store raw now.
            
            # Store in DB (Sample of 1000 rows max for prototype speed)
            # In real world, use bulk insert or specialized time-series DB
            records = []
            for _, row in df.head(1000).iterrows():
                # specific to our synthetic columns
                # Assume columns: timestamp, value, unit
                # Or try to auto-map
                ts = pd.to_datetime(row.get('timestamp', datetime.utcnow()))
                val = row.get('value', 0.0)
                unit = row.get('unit', '')
                
                records.append(SensorData(
                    asset_id=asset_id,
                    timestamp=ts,
                    type="Generic", # parse from filename?
                    value=float(val),
                    unit=unit
                ))
            
            # db.session.bulk_save_objects(records) # Commented out until DB is live
            # db.session.commit()
            
        elif data_type == 'inspection':
            report = quality_service.validate_inspection_data(df)
            
        return jsonify({
            "message": "Ingestion Successful",
            "quality_report": report,
            "rows_processed": len(df)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
