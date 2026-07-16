"""
Lazynext Pre-Processing API (v2) — FastAPI microservice providing:
  - /clip  — Auto-editor silence removal via Lazynext-Editor CLI

Usage:
  python3 scripts/python/main.py
  PORT=8080 python3 scripts/python/main.py
"""

import os
import re
import subprocess
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Lazynext Pre-processing API")

# Base directory that uploaded/processed media must live inside.
MEDIA_BASE_DIR = os.path.realpath(os.getenv("MEDIA_BASE_DIR", "/tmp"))


def _safe_video_id(value: str) -> str:
    """Sanitize a video id to a strict allowlist for safe filename use."""
    slug = re.sub(r"[^A-Za-z0-9_-]", "_", (value or "").strip()).strip("._")
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid video_id")
    return slug


def _safe_media_path(file_path: str) -> str:
    """Resolve a user-supplied media path and confine it to MEDIA_BASE_DIR."""
    if not isinstance(file_path, str) or not file_path.strip():
        raise HTTPException(status_code=400, detail="Invalid file_path")
    resolved = os.path.realpath(os.path.join(MEDIA_BASE_DIR, file_path))
    if resolved != MEDIA_BASE_DIR and not resolved.startswith(MEDIA_BASE_DIR + os.sep):
        raise HTTPException(status_code=400, detail="file_path escapes allowed directory")
    return resolved

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
        safe_id = _safe_video_id(video_id)
        safe_input = _safe_media_path(file_path)
        output_path = os.path.join(MEDIA_BASE_DIR, f"{safe_id}_optimized.mp4")
        subprocess.run(["Lazynext-Editor", safe_input, "--export", "resolve", "-o", output_path], check=True)
        print(f"[{video_id}] Optimization complete! Saved timeline data.")
    except Exception as e:
        print(f"[{video_id}] Auto-editor failed: {e}")

@app.post("/clip")
async def auto_clip(req: VideoRequest, background_tasks: BackgroundTasks):
    """Run Lazynext-Editor silence removal as a background task."""
    print(f"Received request to clip using Auto-Editor: {req.video_id}")
    if not os.path.exists(_safe_media_path(req.file_path)):
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
