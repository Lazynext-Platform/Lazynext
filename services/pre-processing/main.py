from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time

app = FastAPI(title="Lazynext Pre-Processing Service")

class VideoRequest(BaseModel):
    video_id: str

class ProcessRequest(BaseModel):
    video_id: str
    operations: list[str]

@app.get("/")
def read_root():
    return {"status": "ok", "service": "pre-processing"}

@app.post("/transcribe")
def transcribe_audio(req: VideoRequest):
    # Simulate Whisper / FunClip processing
    time.sleep(1.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "subtitles": [
            {"start": 0, "end": 2.5, "text": "Welcome to Lazynext."},
            {"start": 2.5, "end": 5.0, "text": "This is a simulated transcription."}
        ]
    }

@app.post("/process")
def process_video(req: ProcessRequest):
    # Simulate Auto-Editor silence removal and Clip-Anything isolation
    time.sleep(2.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "operations_completed": req.operations,
        "cut_list": [{"start": 1.0, "end": 4.5}]
    }

if __name__ == "__main__":
    import uvicorn
    # Pre-processing runs on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
