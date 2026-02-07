from flask import Blueprint, request, jsonify
import pandas as pd
import os
from datetime import datetime
import numpy as np
import json
from ..models.shared import db
from ..models.asset import Asset
from ..models.sensor import SensorData
from ..models.asset_graph import AssetEdge
from ..models.inspection import InspectionRecord
from ..services.data_quality_service import DataQualityService
from ..services.preprocessing_service import PreprocessingService
from ..services.feature_engine import FeatureEngine
from ..services.ml_pipeline import MLPipeline
from ..utils.auth import require_auth

ingestion_bp = Blueprint('ingestion', __name__)

# Initialize services
quality_service = DataQualityService()
preprocessing_service = PreprocessingService()
feature_engine = FeatureEngine()
ml_pipeline = MLPipeline()

ATTRIBUTE_KEY_MAP = {
    "design pressure": "design_pressure",
    "design_pressure": "design_pressure",
    "designpressure": "design_pressure",
    "design temperature": "design_temperature",
    "design_temperature": "design_temperature",
    "operating pressure": "operating_pressure",
    "operating_pressure": "operating_pressure",
    "operating temperature": "operating_temperature",
    "operating_temperature": "operating_temperature",
    "valve setpoint": "valve_setpoint",
    "valve_setpoint": "valve_setpoint",
    "setpoint": "valve_setpoint",
    "line pressure": "line_pressure",
    "line_pressure": "line_pressure",
    "flow rate": "flow_rate",
    "flow_rate": "flow_rate",
    "vessel volume": "vessel_volume",
    "vessel_volume": "vessel_volume",
    "diameter": "diameter",
    "length": "length",
    "thickness": "thickness",
    "material": "material",
    "fluid": "fluid",
    "corrosion allowance": "corrosion_allowance",
    "corrosion_allowance": "corrosion_allowance",
}

UNIT_MAP = {
    "c": "°C",
    "degc": "°C",
    "degree c": "°C",
    "f": "°F",
    "degf": "°F",
    "psi": "psi",
    "bar": "bar",
    "kpa": "kPa",
    "mpa": "MPa",
    "gpm": "gpm",
    "m3": "m3",
    "m3/h": "m3/h",
    "mm": "mm",
    "in": "in",
}

def normalize_unit(unit):
    if unit is None:
        return ""
    u = str(unit).strip()
    if not u:
        return ""
    key = u.lower().replace("°", "").replace("deg", "deg")
    return UNIT_MAP.get(key, u)

def normalize_attributes(raw_attributes):
    normalized = {}
    for key, val in (raw_attributes or {}).items():
        k = str(key).strip().lower().replace("_", " ")
        k = ATTRIBUTE_KEY_MAP.get(k, key)
        if isinstance(val, dict) and "value" in val:
            normalized[k] = {
                "value": val.get("value"),
                "unit": normalize_unit(val.get("unit"))
            }
        else:
            normalized[k] = {
                "value": val,
                "unit": ""
            }
    return normalized

@ingestion_bp.route('/upload-sensor-data', methods=['POST'])
@require_auth
def upload_sensor_data():
    """
    Ingests CSV sensor data.
    Expected form data: file
    Expected Query Param: project_id
    CSV Columns expected: AssetID/Tag, Timestamp, Value, Type/Metric, Unit (optional)
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    project_id = request.args.get('project_id')
    form_asset_id = request.form.get('asset_id')
    form_metric = request.form.get('metric')
    start_time = request.form.get('start_time')  # optional ISO string
    
    if not project_id:
        return jsonify({"error": "Project ID required"}), 400
        
    try:
        df = pd.read_csv(file)
        
        # Normalize column names
        df.columns = [c.lower().strip() for c in df.columns]
        
        # Identify critical columns
        asset_col = next((c for c in df.columns if c in ['assetid', 'tag', 'asset_id', 'id']), None)
        metric_col = next((c for c in df.columns if c in ['type', 'metric', 'signal']), None)
        time_col = next((c for c in df.columns if c in ['timestamp', 'time', 'ts']), None)
        
        if not asset_col and not form_asset_id:
            return jsonify({"error": "CSV must contain an 'AssetID' or 'Tag' column or provide asset_id in form data"}), 400
        if not metric_col and not form_metric:
            form_metric = "Generic"
        if not time_col:
            # If no time column, fabricate sequential time
            df['time'] = range(len(df))
            time_col = 'time'
            
        # Get valid assets for this project to validate against
        project_assets = {a.id for a in Asset.query.filter_by(project_id=project_id).all()}
        
        # Validate Data Quality
        report = quality_service.validate_sensor_data(df)
        if report['score'] < 50:
             return jsonify({
                 "error": "Data Quality too low for ingestion", 
                 "report": report
             }), 400

        records = []
        mapped_count = 0
        skipped_count = 0

        base_time = None
        if time_col and pd.api.types.is_numeric_dtype(df[time_col]):
            max_time = df[time_col].max()
            base_time = datetime.utcnow() - pd.to_timedelta(float(max_time), unit='s')
        
        for _, row in df.iterrows():
            asset_tag = str(row[asset_col]) if asset_col else str(form_asset_id)
            
            # Auto-mapping logic: Try exact match, then project-filtered match
            # For simplicity, we assume CSV tags match Asset IDs exactly for now
            if asset_tag not in project_assets:
                skipped_count += 1
                continue
                
            raw_time = row.get(time_col)
            if isinstance(raw_time, (int, float, np.integer, np.floating)):
                # Interpret time as seconds offset
                ts = preprocessing_service.convert_seconds_to_timestamp(raw_time, base_time=base_time, start_time=start_time)
            else:
                ts = pd.to_datetime(raw_time)

            val = row.get('value', 0.0)
            metric_type = row.get(metric_col, form_metric)
            if not metric_type:
                skipped_count += 1
                continue
            unit = row.get('unit', '')
            
            records.append(SensorData(
                asset_id=asset_tag,
                timestamp=ts,
                type=metric_type,
                value=float(val),
                unit=unit
            ))
            mapped_count += 1
            
        if records:
            db.session.bulk_save_objects(records)
            db.session.commit()
            
        # Run ML pipeline for each asset/metric seen
        ml_summary = ml_pipeline.run_for_assets(project_id, records)

        return jsonify({
            "message": "Ingestion Processed",
            "quality_report": report,
            "ml_summary": ml_summary,
            "data": {
                "total_rows": len(df),
                "assets_mapped": mapped_count,
                "skipped_rows": skipped_count,
                "details": f"Successfully mapped {mapped_count} readings. Quality Score: {report['score']}%"
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ingestion_bp.route('/upload-inspection-data', methods=['POST'])
@require_auth
def upload_inspection_data():
    """
    Ingests CSV inspection data.
    Expected columns: asset_id/tag, date/timestamp, finding, severity, thickness_mm (optional), corrosion_rate (optional)
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    project_id = request.args.get('project_id')
    form_asset_id = request.args.get('asset_id') or request.form.get('asset_id')
    if not project_id:
        return jsonify({"error": "Project ID required"}), 400

    try:
        df = pd.read_csv(file)
        df.columns = [c.lower().strip() for c in df.columns]

        asset_col = next((c for c in df.columns if c in ['assetid', 'tag', 'asset_id', 'id']), None)
        date_col = next((c for c in df.columns if c in ['date', 'timestamp', 'ts']), None)
        if not asset_col and not form_asset_id:
            return jsonify({"error": "CSV must include asset_id or provide asset_id param"}), 400
        if not date_col:
            # If no date column, fabricate today's date for all records
            df['date'] = pd.Timestamp.utcnow()
            date_col = 'date'

        records = []
        skipped = 0
        valid_assets = {a.id for a in Asset.query.filter_by(project_id=project_id).all()}
        for _, row in df.iterrows():
            asset_tag = str(row[asset_col]) if asset_col else str(form_asset_id)
            if asset_tag not in valid_assets:
                skipped += 1
                continue
            ts = pd.to_datetime(row.get(date_col), errors='coerce')
            if pd.isna(ts):
                skipped += 1
                continue
            records.append(InspectionRecord(
                asset_id=asset_tag,
                timestamp=ts,
                inspector=str(row.get('inspector', '')),
                finding=str(row.get('finding', '')),
                severity=str(row.get('severity', '')),
            ))

        if records:
            db.session.bulk_save_objects(records)
            db.session.commit()

        return jsonify({
            "message": "Inspection data ingested",
            "data": {
                "rows": len(df),
                "assets": df[asset_col].nunique() if asset_col else 1,
                "skipped": skipped
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ingestion_bp.route('/analyze-image', methods=['POST'])
@require_auth
def analyze_image():
    """
    Analyzes an uploaded P&ID image using Gemini.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    project_id = request.args.get('project_id')
    asset_id = request.args.get('asset_id')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        from ..services.gemini_service import GeminiService
        gemini_service = GeminiService()
        
        # 1. Run Gemini Analysis
        result = gemini_service.analyze_drawing(file)
        
        # 2. If asset_id provided, attach attributes to that asset only
        if asset_id and "assets" in result:
            # Use first asset attributes as metadata for the selected asset
            attr = result["assets"][0].get("attributes", {}) if result["assets"] else {}
            asset = Asset.query.get(asset_id)
            if asset and attr:
                meta = normalize_attributes(attr)
                meta["_context"] = {
                    "source": "gemini",
                    "extracted_at": datetime.utcnow().isoformat() + "Z"
                }
                asset.metadata_json = json.dumps(meta)
                db.session.commit()
                result["registry_update"] = f"Updated metadata for {asset_id}"
            return jsonify({
                "message": "Analysis & Registration Successful",
                "data": result
            }), 200

        # 3. Persist to Registry if Project Context exists
        if project_id and "assets" in result:
            new_assets_count = 0
            
            # Fetch existing assets to prevent duplicates (naive check by ID)
            existing_ids = {a.id for a in Asset.query.filter_by(project_id=project_id).all()}
            
            for asset_data in result["assets"]:
                tag = asset_data.get("tag", "UNKNOWN")
                raw_attributes = asset_data.get("attributes", {})
                attributes = normalize_attributes(raw_attributes)
                if attributes:
                    attributes["_context"] = {
                        "source": "gemini",
                        "extracted_at": datetime.utcnow().isoformat() + "Z"
                    }
                
                if tag not in existing_ids:
                    new_asset = Asset(
                        id=tag,
                        name=asset_data.get("description", f"{tag} {asset_data.get('type', 'Asset')}"),
                        type=asset_data.get("type", "Unknown"),
                        location=f"P&ID extracted {datetime.now().strftime('%H:%M')}",
                        project_id=project_id,
                        metadata_json=json.dumps(attributes) if attributes else None
                    )
                    db.session.add(new_asset)
                    existing_ids.add(tag) # Add to local set to prevent dups within same upload
                    new_assets_count += 1
                else:
                    # Update metadata for existing assets
                    asset = Asset.query.get(tag)
                    if asset and attributes:
                        asset.metadata_json = json.dumps(attributes)
            
            if new_assets_count > 0:
                db.session.commit()
                result["registry_update"] = f"Created {new_assets_count} new assets in Project {project_id}"

        # 3. Persist Connectivity Graph
        if project_id and "connections" in result:
            for conn in result["connections"]:
                source = conn.get("source")
                target = conn.get("target")
                if not source or not target:
                    continue
                medium = (conn.get("medium") or "").lower()
                weight = 1.0
                if "gas" in medium or "steam" in medium:
                    weight = 1.3
                elif "crude" in medium or "oil" in medium:
                    weight = 1.2
                elif "water" in medium:
                    weight = 0.9
                edge = AssetEdge(
                    source_id=source,
                    target_id=target,
                    relationship_type="process_flow",
                    weight=weight
                )
                db.session.add(edge)
            db.session.commit()
        
        return jsonify({
            "message": "Analysis & Registration Successful",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ingestion_bp.route('/create-twin', methods=['POST'])
@require_auth
def create_twin():
    """
    Uploads a photoset to create a Digital Twin via KIRI Engine.
    """
    files = request.files.getlist('files')
    if not files or len(files) == 0:
        return jsonify({"error": "No files uploaded"}), 400

    try:
        from ..services.kiri_service import KiriService
        kiri_service = KiriService()
        
        result = kiri_service.create_task(files)
        
        if "error" in result:
             return jsonify(result), 400
             
        return jsonify({
            "message": "Twin Generation Started",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
