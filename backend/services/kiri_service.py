import requests
import os
import logging

class KiriService:
    def __init__(self):
        self.api_url = "https://api.kiriengine.app/v1"
        # In prod, fetch from env or DB
        self.token = os.environ.get("KIRI_API_TOKEN")

    def create_task(self, file_list):
        """
        Creates a 3D reconstruction task.
        Streams files to KIRI Engine if configured. No mocks.
        """
        if not self.token:
            return {"error": "KIRI_API_TOKEN not configured. Upload skipped."}

        if len(file_list) < 20:
            return {"error": f"Minimum 20 images required. Received {len(file_list)}."}

        try:
            files = []
            for f in file_list:
                files.append(("files", (f.filename, f.stream, f.mimetype)))

            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/task/create", headers=headers, files=files, timeout=60)
            if response.status_code >= 400:
                return {"error": f"KIRI error {response.status_code}: {response.text}"}

            return response.json()
        except Exception as e:
            logging.error(f"KIRI upload failed: {str(e)}")
            return {"error": str(e)}

    def get_task_status(self, task_id):
        # Mock status check
        return {"status": "processing", "progress": 45}
