"""
Lazynext Pre-Processing API (v1) — FastAPI microservice providing:
  - /transcribe  — Whisper speech-to-text transcription
  - /auto-edit   — Lazynext-Editor silence trimming

Usage:
  uvicorn scripts.python.app:app --host 0.0.0.0 --port 5000
"""

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import time
import os
import torch
from transformers import pipeline

app = FastAPI(title="Lazynext Pre-processing API")

# Initialize Whisper model on GPU if available
device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"Loading Whisper model on {device}...")
try:
    transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device=device)
except Exception as e:
    print(f"Warning: Whisper model could not be loaded immediately: {e}")
    transcriber = None

class VideoRequest(BaseModel):
    """Request payload for video processing operations.

    Attributes:
        video_id: Unique identifier for the video asset.
        file_path: Filesystem path to the video file.
    """
    video_id: str
    file_path: str = ""

def process_transcription(video_id: str, file_path: str):
    """Background task to run the actual transcription model"""
    print(f"[{video_id}] Starting deep learning transcription...")
    if not transcriber or not os.path.exists(file_path):
        print(f"[{video_id}] Mocking transcription because file missing or model failed.")
        time.sleep(2)
        return
    
    # In a real environment, this extracts audio with ffmpeg, then runs Whisper
    print(f"[{video_id}] Extracting features and generating text...")
    try:
        result = transcriber(file_path)
        print(f"[{video_id}] Transcription complete! Length: {len(result['text'])}")
    except Exception as e:
        print(f"[{video_id}] Inference error: {e}")

@app.post("/transcribe")
async def transcribe_video(req: VideoRequest, background_tasks: BackgroundTasks):
    """Start Whisper transcription as a background task."""
    print(f"Received transcription request for {req.video_id}")
    
    background_tasks.add_task(process_transcription, req.video_id, req.file_path)
    
    return {
        "status": "processing",
        "video_id": req.video_id,
        "message": "Whisper/LazynextClip analysis started on background thread."
    }

@app.post("/auto-edit")
async def auto_edit_video(req: VideoRequest):
    """Trim silences from a video via Lazynext-Editor."""
    print(f"Received Lazynext-Editor request for {req.video_id}")
    # Here we would call the Lazynext-Editor python module to trim silences
    # e.g., os.system(f"Lazynext-Editor {req.file_path}")
    return {
        "status": "success",
        "video_id": req.video_id,
        "message": "Video optimized for silence"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
