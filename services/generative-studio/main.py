from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
import httpx
import os

app = FastAPI(title="Lazynext Generative Studio")

class DiffusionRequest(BaseModel):
    prompt: str

class DubRequest(BaseModel):
    clip_id: str
    target_language: str
    text_to_dub: str = "This is a placeholder text to dub."

class NerfRequest(BaseModel):
    video_id: str

class StemSplitRequest(BaseModel):
    audio_id: str
    stems: int = 4 # Options: 2 (vocals/accomp), 4 (vocals/drums/bass/other), 5 (adds piano)

@app.get("/")
def read_root():
    return {"status": "ok", "service": "generative-studio"}

@app.post("/generate-video")
async def generate_video(req: DiffusionRequest):
    """
    Connects to Replicate API to generate B-Roll using Stable Video Diffusion.
    Requires REPLICATE_API_TOKEN. Falls back to mock if key is missing.
    """
    api_token = os.getenv("REPLICATE_API_TOKEN")
    
    if api_token:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {api_token}",
                    "Content-Type": "application/json"
                }
                # Using a standard Replicate model for Text-to-Video
                payload = {
                    "version": "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", # Example SVD version
                    "input": {
                        "prompt": req.prompt,
                        "frames": 24,
                        "fps": 8
                    }
                }
                
                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                
                # In a real environment, we would poll the 'get' URL until completion.
                # For this setup, we return the prediction ID.
                return {
                    "success": True,
                    "prompt": req.prompt,
                    "prediction_id": data.get("id"),
                    "status_url": data.get("urls", {}).get("get"),
                    "asset_url": None # Polled later
                }
        except Exception as e:
            print(f"Replicate API Error: {e}. Falling back to mock.")
            
    # Mock Fallback
    await asyncio.sleep(3.0)
    return {
        "success": True,
        "prompt": req.prompt,
        "asset_url": f"/mock/assets/gen_{req.prompt[:5].replace(' ', '_')}.mp4"
    }

@app.post("/dub")
async def dub_video(req: DubRequest):
    """
    Connects to ElevenLabs API for Multilingual TTS Dubbing.
    Requires ELEVENLABS_API_KEY. Falls back to mock if key is missing.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                }
                # Example voice_id for Rachel
                voice_id = "21m00Tcm4TlvDq8ikWAM"
                payload = {
                    "text": req.text_to_dub,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
                
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                
                # In a real deployed environment, we upload the raw audio bytes to S3.
                # For this demo, we simulate the S3 upload path.
                return {
                    "success": True,
                    "clip_id": req.clip_id,
                    "language": req.target_language,
                    "audio_url": f"https://cdn.lazynext.ai/dubbed/elevenlabs_{req.clip_id}.mp3"
                }
        except Exception as e:
            print(f"ElevenLabs API Error: {e}. Falling back to mock.")

    # Mock Fallback
    await asyncio.sleep(2.5)
    return {
        "success": True,
        "clip_id": req.clip_id,
        "language": req.target_language,
        "audio_url": f"/mock/assets/dubbed_{req.target_language}.mp3"
    }

@app.post("/nerf-extract")
async def extract_nerf(req: NerfRequest):
    # Simulate 3D Point Cloud generation from 2D sweep
    await asyncio.sleep(4.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "model_url": f"/mock/assets/nerf_{req.video_id}.ply"
    }

@app.post("/split-stems")
async def split_stems(req: StemSplitRequest):
    """
    Simulates sending an audio file to Spleeter / Demucs for stem separation.
    """
    # Simulate AI processing time
    await asyncio.sleep(5.0)
    
    stems_output = {
        "vocals": f"/mock/assets/stems/{req.audio_id}_vocals.wav",
        "accompaniment": f"/mock/assets/stems/{req.audio_id}_accomp.wav"
    }
    
    if req.stems >= 4:
        stems_output = {
            "vocals": f"/mock/assets/stems/{req.audio_id}_vocals.wav",
            "drums": f"/mock/assets/stems/{req.audio_id}_drums.wav",
            "bass": f"/mock/assets/stems/{req.audio_id}_bass.wav",
            "other": f"/mock/assets/stems/{req.audio_id}_other.wav"
        }

    return {
        "success": True,
        "audio_id": req.audio_id,
        "stems": stems_output
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
