"""
Lazynext Pre-Processing API (v2) — FastAPI microservice providing:
  - /clip  — Auto-editor silence removal via Lazynext-Editor CLI

Usage:
  python3 scripts/python/main.py
  PORT=8080 python3 scripts/python/main.py
"""

import os
import subprocess
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Lazynext Pre-processing API")

class VideoRequest(BaseModel):
    """Request payload for video processing operations.

    Attributes:
        video_id: Unique identifier for the video asset.
        file_path: Filesystem path to the video file.
    """
    video_id: str
    file_path: str

def process_auto_editor(video_id: str, file_path: str):
    """Run the Auto-Editor CLI to strip silence from a video and export a
    Resolve-compatible timeline. Intended to run as a background task;
    failures are logged, not raised."""
    print(f"[{video_id}] Starting Auto-Editor silence removal on {file_path}...")
    try:
        # Run Lazynext-Editor CLI natively
        output_path = f"/tmp/{video_id}_optimized.mp4"
        subprocess.run(["Lazynext-Editor", file_path, "--export", "resolve", "-o", output_path], check=True)
        print(f"[{video_id}] Optimization complete! Saved timeline data.")
    except Exception as e:
        print(f"[{video_id}] Auto-editor failed: {e}")

@app.post("/clip")
async def auto_clip(req: VideoRequest, background_tasks: BackgroundTasks):
    """Run Lazynext-Editor silence removal as a background task."""
    print(f"Received request to clip using Auto-Editor: {req.video_id}")
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
        
    background_tasks.add_task(process_auto_editor, req.video_id, req.file_path)
    
    return {
        "status": "processing",
        "video_id": req.video_id,
        "message": "Auto-Editor analysis started on background thread."
    }

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host='0.0.0.0', port=port)
