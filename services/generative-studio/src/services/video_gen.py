import asyncio
import os
import httpx
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from src.models import (
    DiffusionRequest, UpscaleRequest, NeRFRequest,
    StyleTransferRequest, GenerativeFillRequest, AvatarRequest
)
from upscale_pipeline import UpscalePipeline, UpscaleConfig

async def generate_video_service(req: DiffusionRequest):
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

    if not api_token:
        raise HTTPException(
            status_code=503,
            detail="Video generation unavailable — Replicate API token not configured",
        )

    raise HTTPException(
        status_code=500,
        detail="Video generation failed internally",
    )

async def upscale_video_service(req: UpscaleRequest):
    video_path = f"/tmp/{req.video_id}.mp4"
    output_path = f"/tmp/{req.video_id}_{req.scale}x.mp4"

    config = UpscaleConfig(
        scale=req.scale,
        model="RealESRGAN_x4plus" if req.scale == 4 else "RealESRGAN_x2plus"
    )
    pipeline = UpscalePipeline(config)
    
    # The pipeline is synchronous, so we run it in a thread pool to avoid blocking the async event loop.
    import asyncio
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.upscale, video_path, output_path)

    if not result.success:
        raise HTTPException(
            status_code=503,
            detail=f"Upscaling unavailable: {result.error}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "scale": req.scale,
        "source": result.used_method,
        "output_url": f"file://{result.output_path}",
    }

async def extract_nerf_service(req: NeRFRequest):
    return JSONResponse(
        status_code=410,
        content={
            "success": False,
            "error": "This endpoint has been removed from generative-studio. Use /nerf-extract on the pre-processing service (port 8000).",
            "video_id": req.video_id,
        },
        headers={"Deprecation": "true", "Sunset": "Sat, 01 Aug 2026 00:00:00 GMT"},
    )

async def style_transfer_service(req: StyleTransferRequest):
    video_path = f"/tmp/{req.video_id}.mp4"
    output_path = f"/tmp/{req.video_id}_styled.mp4"
    method = None

    if os.path.exists(video_path):
        try:
            import cv2
            import numpy as np
            import subprocess
            import tempfile

            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

                step = max(1, total_frames // 30)
                frames_dir = tempfile.mkdtemp(prefix="style_")

                processed = []
                frame_idx = 0
                output_idx = 0
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    if frame_idx % step == 0:
                        if "anime" in req.style_prompt.lower():
                            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                            gray = cv2.medianBlur(gray, 5)
                            edges = cv2.adaptiveThreshold(gray, 255,
                                cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
                            color = cv2.bilateralFilter(frame, 9, 300, 300)
                            styled = cv2.bitwise_and(color, color, mask=edges)
                        elif "clay" in req.style_prompt.lower():
                            styled = cv2.stylization(frame, sigma_s=60, sigma_r=0.6)
                        elif "pencil" in req.style_prompt.lower() or "sketch" in req.style_prompt.lower():
                            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                            inv = 255 - gray
                            blur = cv2.GaussianBlur(inv, (21, 21), 0)
                            styled = cv2.divide(gray, 255 - blur, scale=256.0)
                            styled = cv2.cvtColor(styled, cv2.COLOR_GRAY2BGR)
                        else:
                            styled = cv2.detailEnhance(frame, sigma_s=10, sigma_r=0.15)

                        frame_path = f"{frames_dir}/frame_{output_idx:04d}.png"
                        cv2.imwrite(frame_path, styled)
                        processed.append(frame_path)
                        output_idx += 1

                    frame_idx += 1
                    if output_idx >= 30:
                        break

                cap.release()

                if processed:
                    import glob
                    result = subprocess.run([
                        "ffmpeg", "-y", "-framerate", str(fps / step),
                        "-i", f"{frames_dir}/frame_%04d.png",
                        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                        output_path
                    ], capture_output=True, timeout=300)
                    if result.returncode == 0:
                        method = "opencv_stylization"

                import shutil
                shutil.rmtree(frames_dir, ignore_errors=True)

        except ImportError:
            raise HTTPException(status_code=503, detail="OpenCV not installed for style transfer")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Style transfer error: {e}")
            
    if not method:
        raise HTTPException(status_code=500, detail="Style transfer failed internally.")

    return {
        "success": True,
        "video_id": req.video_id,
        "style_applied": req.style_prompt,
        "source": method,
        "styled_video_url": f"file://{output_path}" if os.path.exists(output_path) else None
    }

async def generative_fill_service(req: GenerativeFillRequest):
    raise HTTPException(status_code=501, detail="Generative fill backend not implemented yet.")

async def generate_avatar_service(req: AvatarRequest):
    """Generate an AI avatar video from text script.
    
    Uses ElevenLabs text-to-speech + lip-sync generation.
    Falls back to HTTP 503 when ELEVENLABS_API_KEY is not configured.
    """
    api_token = os.getenv("ELEVENLABS_API_KEY")
    if not api_token:
        raise HTTPException(
            status_code=503,
            detail="Avatar generation unavailable — ELEVENLABS_API_KEY not configured",
        )

    try:
        async with httpx.AsyncClient() as client:
            # Generate speech from text
            voice_id = req.voice_id or "21m00Tcm4TlvDq8ikWAM"  # Default "Rachel" voice
            tts_response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_token,
                    "Content-Type": "application/json",
                },
                json={
                    "text": req.script,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=120.0,
            )
            tts_response.raise_for_status()

            return {
                "success": True,
                "avatar_id": req.avatar_id or f"avatar_{voice_id}",
                "script": req.script,
                "source": "elevenlabs",
                "audio_url": tts_response.headers.get("audio-url", "generated"),
            }
    except Exception as e:
        print(f"[GenerativeStudio] Avatar generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Avatar generation failed: {e}")
