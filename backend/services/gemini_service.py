import google.generativeai as genai
import os
import json
import logging
from datetime import datetime

API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class GeminiService:
    def __init__(self):
        if not API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def analyze_pid(self, image_path: str):
        """
        Analyzes a P&ID image to identify assets and connectivity.
        """
        try:
            # Load the image
            with open(image_path, "rb") as f:
                image_data = f.read()
                
            prompt = """
            You are an expert Asset Integrity Engineer. Analyze this P&ID (Piping & Instrumentation Diagram) image.
            
            GOAL: Extract a structured registry of industrial assets and their connectivity.

            1. **ASSETS**: Identify all major equipment (Pumps, Vessels, Heat Exchangers, Tanks).
               - Extract the **TAG** (e.g., P-101A, V-302, E-100). If distinct tag is not visible, infer a logical one based on type.
               - Determine **TYPE** (Pump, Vessel, Exchanger, Tank).
               - **COORDINATES**: Approximate centroid [x, y] in % of image width/height (0-100).
               - **ATTRIBUTES**: Extract numeric values where present (design pressure, design temperature, valve setpoint, line pressure, flow rate). Include units if visible.

            2. **CONNECTIVITY**: Trace major lines connecting these assets.
               - **SOURCE**: Tag of upstream asset.
               - **TARGET**: Tag of downstream asset.
               - **MEDIUM**: Fluid type (e.g. Crude, Water, Steam, Gas) if inferred from labels/line types.

            Use ONLY these attribute keys (snake_case):
            design_pressure, design_temperature, operating_pressure, operating_temperature,
            valve_setpoint, line_pressure, flow_rate, vessel_volume, diameter, length, thickness,
            material, fluid, corrosion_allowance.

            OUTPUT SCHEMA (Strict JSON):
            {
                "assets": [
                    { 
                      "tag": "V-101", 
                      "type": "Vessel", 
                      "description": "Separator Vessel", 
                      "coordinates": [50, 50],
                      "attributes": {
                        "design_pressure": { "value": 150, "unit": "psi" },
                        "design_temperature": { "value": 320, "unit": "C" },
                        "operating_pressure": { "value": 90, "unit": "psi" },
                        "operating_temperature": { "value": 250, "unit": "C" },
                        "valve_setpoint": { "value": 180, "unit": "psi" },
                        "line_pressure": { "value": 120, "unit": "psi" },
                        "flow_rate": { "value": 55, "unit": "gpm" },
                        "vessel_volume": { "value": 10, "unit": "m3" },
                        "diameter": { "value": 1.2, "unit": "m" },
                        "length": { "value": 4.0, "unit": "m" },
                        "thickness": { "value": 12, "unit": "mm" },
                        "material": { "value": "SA-516 Gr.70", "unit": "" },
                        "fluid": { "value": "Crude Oil", "unit": "" },
                        "corrosion_allowance": { "value": 3, "unit": "mm" }
                      }
                    }
                ],
                "connections": [
                    { "source": "V-101", "target": "P-101A", "medium": "Crude Oil" }
                ],
                "summary": "High-level summary of the process loop shown."
            }
            
            Return ONLY valid JSON. No Markdown.
            """

            response = self.model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_data}
            ])

            # Parse JSON from response
            text = response.text
            # Cleanup markdown code blocks if present
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            return json.loads(text)

        except Exception as e:
            logging.error(f"Gemini Analysis Failed: {str(e)}")
            return {"error": str(e)}

    def analyze_drawing(self, file_storage):
        """
        Wrapper to handle Flask FileStorage directly
        """
        # Save temp file
        temp_path = f"temp_{datetime.utcnow().timestamp()}.jpg"
        file_storage.save(temp_path)
        
        try:
            result = self.analyze_pid(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        return result
