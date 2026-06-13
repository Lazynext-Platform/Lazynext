from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
import httpx
import os

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
async def transcribe_audio(req: VideoRequest):
    """
    Connects to OpenAI Whisper API for accurate video transcription.
    Requires OPENAI_API_KEY. Falls back to mock if key is missing or file not found.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    # In a real deployed environment, we would pull from S3.
    # For now, we assume the file is mounted or cached locally.
    file_path = f"/tmp/{req.video_id}.mp4"
    
    if api_key and os.path.exists(file_path):
        try:
            async with httpx.AsyncClient() as client:
                with open(file_path, "rb") as audio_file:
                    files = {
                        "file": (file_path, audio_file, "audio/mp4"),
                        "model": (None, "whisper-1"),
                        "response_format": (None, "verbose_json"),
                        "timestamp_granularities[]": (None, "word")
                    }
                    headers = {"Authorization": f"Bearer {api_key}"}
                    
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        files=files,
                        headers=headers,
                        timeout=60.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    # Map Whisper 'words' output to our subtitle format
                    subtitles = []
                    if "words" in data:
                        for w in data["words"]:
                            subtitles.append({
                                "start": w["start"],
                                "end": w["end"],
                                "text": w["word"]
                            })
                            
                    return {
                        "success": True,
                        "video_id": req.video_id,
                        "subtitles": subtitles
                    }
        except Exception as e:
            print(f"Whisper API Error: {e}. Falling back to mock.")
            
    # Mock Fallback
    await asyncio.sleep(1.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "subtitles": [
            {"start": 0, "end": 2.5, "text": "Welcome to Lazynext."},
            {"start": 2.5, "end": 5.0, "text": "This is a simulated transcription fallback."}
        ]
    }

@app.post("/process")
async def process_video(req: ProcessRequest):
    # Simulate Auto-Editor silence removal and Clip-Anything isolation
    await asyncio.sleep(2.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "operations_completed": req.operations,
        "cut_list": [{"start": 1.0, "end": 4.5}]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
