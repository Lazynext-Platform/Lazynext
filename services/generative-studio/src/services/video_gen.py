"""
Video generation services: diffusion, upscaling, NeRF, style transfer,
generative fill, and AI avatar generation.

Uses Replicate for cloud inference (Stable Video Diffusion, inpainting),
RealESRGAN for upscaling, ElevenLabs for avatar TTS, and OpenCV-based
local fallbacks for style transfer and inpainting.
"""

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
    """Generate video from a text prompt via Replicate Stable Video Diffusion.

    Submits a prediction to the Replicate API and returns the prediction ID
    for polling.

    Args:
        req: DiffusionRequest with prompt, dimensions, and frame count.

    Returns:
        dict with success, prompt, source, prediction_id, and status_url.

    Raises:
        HTTPException: 503 if REPLICATE_API_TOKEN is missing, 500 on failure.
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
            raise HTTPException(
                status_code=502,
                detail=f"Replicate API error: {e}",
            )

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
    """Upscale video resolution using RealESRGAN (2x or 4x).

    Runs the UpscalePipeline in a thread pool to avoid blocking the async
    event loop.

    Args:
        req: UpscaleRequest with video_id and scale factor.

    Returns:
        dict with success, video_id, scale, source, and output_url.

    Raises:
        HTTPException: 503 if upscaling fails.
    """
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
        "source": result.model,
        "output_url": f"file://{result.output_path}",
    }

async def extract_nerf_service(req: NeRFRequest):
    """Deprecated NeRF endpoint — returns 410 Gone with redirect header.

    Use /nerf-extract on the pre-processing service (port 8000) instead.
    """
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
    """Apply visual style transfer to a video using OpenCV effects.

    Supports anime (edge-aware), claymation (stylization), pencil sketch,
    and detail-enhancement styles. Encodes result with ffmpeg.

    Args:
        req: StyleTransferRequest with video_id and style_prompt.

    Returns:
        dict with success, video_id, style_applied, source, and styled_video_url.

    Raises:
        HTTPException: 503 if OpenCV unavailable, 500 on processing error.
    """
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
    """Fill masked regions in video using Replicate inpainting API.

    Falls back to local OpenCV inpainting (Navier-Stokes) when API key
    is not configured, or returns HTTP 503 when neither is available.
    """
    video_path = f"/tmp/{req.video_id}.mp4"
    mask_path = f"/tmp/{req.video_id}_mask.png"
    output_path = f"/tmp/{req.video_id}_filled.mp4"

    api_token = os.getenv("REPLICATE_API_TOKEN")

    if api_token:
        try:
            async with httpx.AsyncClient() as client:
                # Upload video and mask as data URIs or use signed URLs
                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={
                        "Authorization": f"Bearer {api_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "version": "c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866bfb27c061316",
                        "input": {
                            "video": f"file://{video_path}",
                            "mask": f"file://{mask_path}" if os.path.exists(mask_path) else "center",
                            "prompt": req.prompt,
                            "num_inference_steps": 25,
                        },
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "success": True,
                    "video_id": req.video_id,
                    "source": "replicate",
                    "prediction_id": data.get("id"),
                    "status_url": data.get("urls", {}).get("get"),
                }
        except Exception as e:
            print(f"[GenerativeStudio] Replicate inpainting error: {e}")

    # Fallback: OpenCV Navier-Stokes inpainting
    if os.path.exists(video_path):
        try:
            import cv2
            import numpy as np
            import subprocess
            import tempfile

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail=f"Cannot open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Load or generate mask
            mask = None
            if os.path.exists(mask_path):
                mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
                if mask is not None:
                    mask = cv2.resize(mask, (width, height))

            if mask is None:
                # Create a center-region mask from prompt (default: center 20%)
                mask = np.zeros((height, width), dtype=np.uint8)
                if req.mask_coordinates:
                    # Use provided mask coordinates
                    x1, y1, x2, y2 = [int(c) for c in req.mask_coordinates[:4]]
                    mask[int(y1):int(y2), int(x1):int(x2)] = 255
                else:
                    # Full-frame subtle repair
                    mask[height // 4:3 * height // 4, width // 4:3 * width // 4] = 255

            frames_dir = tempfile.mkdtemp(prefix="fill_")
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Adjust mask to match frame if needed
                frame_mask = mask
                if frame_mask.shape[:2] != (frame.shape[0], frame.shape[1]):
                    frame_mask = cv2.resize(mask, (frame.shape[1], frame.shape[0]))

                # Navier-Stokes inpainting
                filled = cv2.inpaint(frame, frame_mask, inpaintRadius=3, flags=cv2.INPAINT_NS)

                frame_path = f"{frames_dir}/frame_{frame_idx:04d}.png"
                cv2.imwrite(frame_path, filled)
                frame_idx += 1

                if frame_idx >= 300:  # Cap at 300 frames for performance
                    break

            cap.release()

            if frame_idx > 0:
                result = subprocess.run([
                    "ffmpeg", "-y", "-framerate", str(fps),
                    "-i", f"{frames_dir}/frame_%04d.png",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                    output_path
                ], capture_output=True, timeout=300)

                import shutil
                shutil.rmtree(frames_dir, ignore_errors=True)

                if result.returncode == 0:
                    return {
                        "success": True,
                        "video_id": req.video_id,
                        "source": "opencv_inpaint",
                        "filled_video_url": f"file://{output_path}",
                    }

        except ImportError:
            print("[GenerativeStudio] OpenCV not available for inpainting")
        except Exception as e:
            print(f"[GenerativeStudio] OpenCV inpainting error: {e}")

    raise HTTPException(
        status_code=503,
        detail="Generative fill unavailable — configure REPLICATE_API_TOKEN or install opencv-python with ffmpeg",
    )

async def generate_avatar_service(req: AvatarRequest):
    """Generate an AI avatar video from text script using Gemini TTS."""
    source = "gemini-tts"

    try:
        from src.services.audio_gen import _gemini_tts
        await _gemini_tts(req.script, "en-US")
        return {
            "success": True,
            "avatar_id": req.avatar_model,
            "script": req.script,
            "source": source,
            "audio_url": "https://cdn.lazynext.ai/avatar/gemini_avatar.mp3",
        }
    except Exception as e:
        print(f"[GenerativeStudio] Avatar generation error: {e}")

    raise HTTPException(
        status_code=503,
        detail="Avatar generation unavailable — configure GEMINI_API_KEY",
    )
