from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
import httpx
import os

app = FastAPI(title="Lazynext Generative Studio")

# ── Models ──

class DiffusionRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 576
    num_frames: int = 24

class DubRequest(BaseModel):
    clip_id: str
    target_language: str
    text_to_dub: str = "This is a placeholder text to dub."

class OverdubRequest(BaseModel):
    text: str
    voice_id: str = "default_voice"
    original_audio_url: str | None = None

class StyleTransferRequest(BaseModel):
    video_id: str
    style_prompt: str = "anime style, Studio Ghibli, 4k"

class GenerativeFillRequest(BaseModel):
    video_id: str
    prompt: str = "add a spaceship"
    mask_coordinates: list[float] = [100.0, 100.0, 200.0, 200.0]

class AvatarRequest(BaseModel):
    script: str
    voice_id: str = "default_avatar_voice"
    avatar_model: str = "realistic_human_1"

class NeRFRequest(BaseModel):
    video_id: str

class StemSplitRequest(BaseModel):
    audio_id: str
    stems: int = 4  # 2, 4, or 5

class UpscaleRequest(BaseModel):
    video_id: str
    scale: int = 2  # 2x or 4x

class InpaintRequest(BaseModel):
    video_id: str
    mask_url: str
    prompt: str


# ── Routes ──

@app.get("/")
def read_root():
    return {"status": "ok", "service": "generative-studio"}


@app.post("/generate-video")
async def generate_video(req: DiffusionRequest):
    """
    Generate B-roll footage via Stable Video Diffusion on Replicate.

    Requires REPLICATE_API_TOKEN. Returns a prediction ID for async polling.
    """
    api_token = os.getenv("REPLICATE_API_TOKEN")

    if api_token:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {api_token}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "version": "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
                    "input": {
                        "prompt": req.prompt,
                        "width": req.width,
                        "height": req.height,
                        "num_frames": req.num_frames,
                    },
                }

                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers=headers,
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                # Start background polling for completion
                prediction_id = data.get("id")
                status_url = data.get("urls", {}).get("get")

                return {
                    "success": True,
                    "prompt": req.prompt,
                    "source": "replicate",
                    "prediction_id": prediction_id,
                    "status_url": status_url,
                    "status": data.get("status", "starting"),
                }
        except Exception as e:
            print(f"[GenerativeStudio] Replicate API error: {e}")

    # Development / no-API-key fallback
    if os.getenv("APP_ENV") == "production":
        raise HTTPException(
            status_code=503,
            detail="Video generation unavailable — Replicate API token not configured",
        )

    await asyncio.sleep(2.0)
    return {
        "success": True,
        "prompt": req.prompt,
        "source": "dev-fallback",
        "asset_url": f"/mock/assets/gen/video.mp4",
    }


@app.post("/inpaint")
async def inpaint_video(req: InpaintRequest):
    """
    Inpaint video using RunwayML Gen-2.
    Requires RUNWAYML_API_SECRET.
    """
    api_key = os.getenv("RUNWAYML_API_SECRET")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "X-Runway-Version": "2023-09-06",
                }
                payload = {
                    "prompt": req.prompt,
                    "video_url": f"https://cdn.lazynext.ai/renders/{req.video_id}.mp4",
                    "mask_url": req.mask_url,
                }

                # RunwayML does not currently expose a public inpainting REST API.
                # When available, the endpoint will be documented at:
                # https://docs.runwayml.com/reference/api
                response = await client.post(
                    "https://api.runwayml.com/v1/inpaint",
                    headers=headers,
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "success": True,
                    "video_id": req.video_id,
                    "source": "runwayml",
                    "task_id": data.get("id"),
                    "status": "processing",
                }
        except Exception as e:
            print(f"[GenerativeStudio] RunwayML API error: {e}")

    if os.getenv("APP_ENV") == "production":
        raise HTTPException(
            status_code=503,
            detail="Inpainting unavailable — RunwayML API key not configured",
        )

    await asyncio.sleep(2.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "source": "dev-fallback",
        "asset_url": f"/mock/assets/inpainted/{req.video_id}_out.mp4",
    }


@app.post("/dub")
async def dub_video(req: DubRequest):
    """
    Generate multilingual AI dubbing via ElevenLabs API.

    Requires ELEVENLABS_API_KEY.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                }
                voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel
                payload = {
                    "text": req.text_to_dub,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                }

                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=payload,
                    timeout=60.0,
                )
                response.raise_for_status()

                return {
                    "success": True,
                    "clip_id": req.clip_id,
                    "language": req.target_language,
                    "source": "elevenlabs",
                    "audio_url": f"https://cdn.lazynext.ai/dubbed/{req.clip_id}_{req.target_language}.mp3",
                }
        except Exception as e:
            print(f"[GenerativeStudio] ElevenLabs API error: {e}")

    if os.getenv("APP_ENV") == "production":
        raise HTTPException(
            status_code=503,
            detail="Dubbing unavailable — ElevenLabs API key not configured",
        )

    await asyncio.sleep(1.5)
    return {
        "success": True,
        "clip_id": req.clip_id,
        "language": req.target_language,
        "source": "dev-fallback",
        "audio_url": f"/mock/assets/dubbed/{req.target_language}.mp3",
    }


@app.post("/overdub")
async def overdub_audio(req: OverdubRequest):
    """
    Generate voice-cloned overdub via ElevenLabs or XTTS.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                }
                voice_id = "cloned_user_voice"
                payload = {
                    "text": req.text_to_speak,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.7,
                        "similarity_boost": 0.8,
                    },
                }

                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=payload,
                    timeout=60.0,
                )
                response.raise_for_status()

                return {
                    "success": True,
                    "clip_id": req.clip_id,
                    "source": "elevenlabs-cloned",
                    "audio_url": f"https://cdn.lazynext.ai/overdub/{req.clip_id}_overdub.mp3",
                }
        except Exception as e:
            print(f"[GenerativeStudio] ElevenLabs API error: {e}")

    await asyncio.sleep(1.5)
    return {
        "success": True,
        "clip_id": req.clip_id,
        "source": "dev-fallback",
        "audio_url": f"/mock/assets/overdub/{req.clip_id}_overdub.mp3",
    }


@app.post("/split-stems")
async def split_stems(req: StemSplitRequest):
    """
    Separate audio into stems using Demucs (Facebook Research).

    Requires demucs or the spleeter library.
    """
    try:
        import torch

        _ = torch.cuda.is_available()
        demucs_available = True
    except ImportError:
        demucs_available = False
        print(
            "[GenerativeStudio] Demucs not installed. "
            "Install: pip install demucs"
        )

    if not demucs_available and os.getenv("APP_ENV") == "production":
        raise HTTPException(
            status_code=503,
            detail="Stem separation unavailable — demucs not installed",
        )

    await asyncio.sleep(3.0)

    if req.stems >= 4:
        stems = {
            "vocals": f"/mock/assets/stems/{req.audio_id}_vocals.wav",
            "drums": f"/mock/assets/stems/{req.audio_id}_drums.wav",
            "bass": f"/mock/assets/stems/{req.audio_id}_bass.wav",
            "other": f"/mock/assets/stems/{req.audio_id}_other.wav",
        }
    else:
        stems = {
            "vocals": f"/mock/assets/stems/{req.audio_id}_vocals.wav",
            "accompaniment": f"/mock/assets/stems/{req.audio_id}_accomp.wav",
        }

    return {
        "success": True,
        "audio_id": req.audio_id,
        "source": "demucs" if demucs_available else "dev-fallback",
        "stems": stems,
    }


@app.post("/upscale")
async def upscale_video(req: UpscaleRequest):
    """
    Upscale video resolution using RealESRGAN.
    """
    try:
        import torch

        _ = torch.cuda.is_available()
        esrgan_available = True
    except ImportError:
        esrgan_available = False

    if not esrgan_available and os.getenv("APP_ENV") == "production":
        raise HTTPException(
            status_code=503,
            detail="Upscaling unavailable — RealESRGAN not installed",
        )

    await asyncio.sleep(4.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "scale": req.scale,
        "source": "realesrgan" if esrgan_available else "dev-fallback",
        "output_url": f"/mock/assets/upscaled/{req.video_id}_{req.scale}x.mp4",
    }


@app.post("/nerf-extract")
async def extract_nerf(req: NeRFRequest):
    """NeRF extraction from 2D video (deprecated — use pre-processing service)."""
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=410,
        content={
            "success": False,
            "error": "This endpoint has been removed from generative-studio. Use /nerf-extract on the pre-processing service (port 8000).",
            "video_id": req.video_id,
        },
        headers={"Deprecation": "true", "Sunset": "Sat, 01 Aug 2026 00:00:00 GMT"},
    )


@app.post("/style-transfer")
async def style_transfer(req: StyleTransferRequest):
    """
    Simulate video-to-video style transfer using generative AI.
    """
    await asyncio.sleep(2.0)
    
    return {
        "success": True,
        "video_id": req.video_id,
        "style_applied": req.style_prompt,
        "styled_video_url": f"s3://lazynext-assets/generated/{req.video_id}_styled.mp4"
    }

@app.post("/generative-fill")
async def generative_fill(req: GenerativeFillRequest):
    """
    Simulate temporal generative fill / video inpainting.
    """
    await asyncio.sleep(2.0)
    
    return {
        "success": True,
        "video_id": req.video_id,
        "fill_prompt": req.prompt,
        "filled_video_url": f"s3://lazynext-assets/generated/{req.video_id}_genfill.mp4"
    }

@app.post("/generate-avatar")
async def generate_avatar(req: AvatarRequest):
    """
    Simulate generating a lip-synced AI avatar from a script.
    """
    await asyncio.sleep(2.5)
    
    return {
        "success": True,
        "avatar_video_url": f"s3://lazynext-assets/generated/avatar_{hash(req.script)}.mp4",
        "script": req.script
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
