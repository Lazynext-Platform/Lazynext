import os
import subprocess
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Lazynext Pre-processing API")

class VideoRequest(BaseModel):
    video_id: str
    file_path: str

def process_auto_editor(video_id: str, file_path: str):
    print(f"[{video_id}] Starting Auto-Editor silence removal on {file_path}...")
    try:
        # Run auto-editor CLI natively
        output_path = f"/tmp/{video_id}_optimized.mp4"
        subprocess.run(["auto-editor", file_path, "--export", "resolve", "-o", output_path], check=True)
        print(f"[{video_id}] Optimization complete! Saved timeline data.")
    except Exception as e:
        print(f"[{video_id}] Auto-editor failed: {e}")

@app.post("/clip")
async def auto_clip(req: VideoRequest, background_tasks: BackgroundTasks):
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
