"""
Video generation services: text-to-video via Modal (pure PyTorch SD pipeline),
upscaling, style transfer, generative fill, and AI avatar generation.

Modal SD Pipeline: $30/mo free credits, ~2 min gen, 3 concurrent, A10G GPU.
RealESRGAN for upscaling, Edge TTS for avatars, OpenCV for effects.
"""

import asyncio
import base64
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
	"""Generate video via Modal SD pipeline.

	Requires MODAL_VIDEO_ENDPOINT env var.
	Modal: $30/mo free credits, ~35s per video, 3 concurrent.
	"""
	endpoint = os.getenv("MODAL_VIDEO_ENDPOINT", "")

	if not endpoint:
		raise HTTPException(
			status_code=503,
			detail="Video generation unavailable — set MODAL_VIDEO_ENDPOINT. "
			"Deploy: modal deploy scripts/modal-video-gen.py",
		)

	try:
		async with httpx.AsyncClient(timeout=600.0, follow_redirects=True) as client:
			resp = await client.post(
				endpoint,
				json={
					"prompt": req.prompt,
					"width": req.width,
					"height": req.height,
					"num_frames": req.num_frames,
				},
			)
			resp.raise_for_status()
			data = resp.json()

			if not data.get("success"):
				raise HTTPException(
					status_code=502,
					detail=f"Modal error: {data.get('error', 'unknown')}",
				)

			video_b64 = data.get("video_base64", "")
			if not video_b64:
				raise HTTPException(status_code=502, detail="Modal returned no video")

			video_bytes = base64.b64decode(video_b64)
			output_path = f"/tmp/generated_{hash(req.prompt)}.mp4"
			with open(output_path, "wb") as f:
				f.write(video_bytes)

			return {
				"success": True,
				"prompt": req.prompt,
				"source": "modal-sd-pipeline",
				"video_url": f"file://{output_path}",
				"stats": {
					"load_time": data.get("load_time"),
					"gen_time": data.get("gen_time"),
					"size": data.get("size"),
				},
			}

	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Modal API error: {e}")


async def upscale_video_service(req: UpscaleRequest):
	"""Upscale video resolution using RealESRGAN (2x or 4x)."""
	video_path = f"/tmp/{req.video_id}.mp4"
	output_path = f"/tmp/{req.video_id}_{req.scale}x.mp4"
	config = UpscaleConfig(scale=req.scale, model="RealESRGAN_x4plus" if req.scale == 4 else "RealESRGAN_x2plus")
	pipeline = UpscalePipeline(config)
	loop = asyncio.get_running_loop()
	result = await loop.run_in_executor(None, pipeline.upscale, video_path, output_path)
	if not result.success: raise HTTPException(status_code=503, detail=f"Upscaling unavailable: {result.error}")
	return {"success": True, "video_id": req.video_id, "scale": req.scale, "source": result.model, "output_url": f"file://{result.output_path}"}


async def extract_nerf_service(req: NeRFRequest):
	return JSONResponse(status_code=410, content={"success": False, "error": "Use /nerf-extract on pre-processing service (port 8000).", "video_id": req.video_id}, headers={"Deprecation": "true", "Sunset": "Sat, 01 Aug 2026 00:00:00 GMT"})


async def style_transfer_service(req: StyleTransferRequest):
	video_path = f"/tmp/{req.video_id}.mp4"; output_path = f"/tmp/{req.video_id}_styled.mp4"
	if not os.path.exists(video_path): raise HTTPException(status_code=500, detail="Video not found")
	try:
		import cv2, numpy as np, subprocess, tempfile
		cap = cv2.VideoCapture(video_path)
		if not cap.isOpened(): raise HTTPException(status_code=400, detail="Cannot open video")
		fps = cap.get(cv2.CAP_PROP_FPS) or 24.0; total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); step = max(1, total // 30)
		td = tempfile.mkdtemp(prefix="style_"); oi = fi = 0
		while True:
			ret, frame = cap.read()
			if not ret: break
			if fi % step == 0:
				sp = req.style_prompt.lower()
				if "anime" in sp:
					g = cv2.medianBlur(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), 5)
					e = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
					c = cv2.bilateralFilter(frame, 9, 300, 300); styled = cv2.bitwise_and(c, c, mask=e)
				elif "clay" in sp: styled = cv2.stylization(frame, sigma_s=60, sigma_r=0.6)
				elif "pencil" in sp or "sketch" in sp:
					g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY); inv = 255 - g; blur = cv2.GaussianBlur(inv, (21, 21), 0)
					styled = cv2.cvtColor(cv2.divide(g, 255 - blur, scale=256.0), cv2.COLOR_GRAY2BGR)
				else: styled = cv2.detailEnhance(frame, sigma_s=10, sigma_r=0.15)
				cv2.imwrite(f"{td}/frame_{oi:04d}.png", styled); oi += 1
			fi += 1
			if oi >= 30: break
		cap.release()
		if oi > 0:
			r = subprocess.run(["ffmpeg", "-y", "-framerate", str(fps/step), "-i", f"{td}/frame_%04d.png", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", output_path], capture_output=True, timeout=300)
			import shutil; shutil.rmtree(td, ignore_errors=True)
			if r.returncode == 0: return {"success": True, "video_id": req.video_id, "style_applied": req.style_prompt, "source": "opencv_stylization", "styled_video_url": f"file://{output_path}"}
	except ImportError: raise HTTPException(status_code=503, detail="OpenCV not installed")
	except Exception as e: raise HTTPException(status_code=500, detail=f"Style transfer error: {e}")
	raise HTTPException(status_code=500, detail="Style transfer failed internally")


async def generative_fill_service(req: GenerativeFillRequest):
	video_path = f"/tmp/{req.video_id}.mp4"; mask_path = f"/tmp/{req.video_id}_mask.png"; output_path = f"/tmp/{req.video_id}_filled.mp4"
	if not os.path.exists(video_path): raise HTTPException(status_code=503, detail="Video not found")
	try:
		import cv2, numpy as np, subprocess, tempfile
		cap = cv2.VideoCapture(video_path)
		if not cap.isOpened(): raise HTTPException(status_code=400, detail="Cannot open video")
		fps = cap.get(cv2.CAP_PROP_FPS) or 24.0; w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
		mask = None
		if os.path.exists(mask_path): mask = cv2.resize(cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE), (w, h)) if cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE) is not None else None
		if mask is None:
			mask = np.zeros((h, w), dtype=np.uint8)
			if req.mask_coordinates: x1, y1, x2, y2 = [int(c) for c in req.mask_coordinates[:4]]; mask[y1:y2, x1:x2] = 255
			else: mask[h//4:3*h//4, w//4:3*w//4] = 255
		td = tempfile.mkdtemp(prefix="fill_"); fi = 0
		while True:
			ret, frame = cap.read()
			if not ret: break
			fm = cv2.resize(mask, (frame.shape[1], frame.shape[0])) if mask.shape[:2] != (frame.shape[0], frame.shape[1]) else mask
			filled = cv2.inpaint(frame, fm, inpaintRadius=3, flags=cv2.INPAINT_NS)
			cv2.imwrite(f"{td}/frame_{fi:04d}.png", filled); fi += 1
			if fi >= 300: break
		cap.release()
		if fi > 0:
			r = subprocess.run(["ffmpeg", "-y", "-framerate", str(fps), "-i", f"{td}/frame_%04d.png", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", output_path], capture_output=True, timeout=300)
			import shutil; shutil.rmtree(td, ignore_errors=True)
			if r.returncode == 0: return {"success": True, "video_id": req.video_id, "source": "opencv_inpaint", "filled_video_url": f"file://{output_path}"}
	except ImportError: print("[GenerativeStudio] OpenCV not available")
	except Exception as e: print(f"[GenerativeStudio] OpenCV error: {e}")
	raise HTTPException(status_code=503, detail="Generative fill unavailable — install opencv-python-headless")


async def generate_avatar_service(req: AvatarRequest):
	try:
		from src.services.audio_gen import _edge_tts, _safe_slug
		audio_bytes = await _edge_tts(req.script, "en-US")
		output_path = f"/tmp/avatar_{_safe_slug(req.avatar_model, 'avatar')}.mp3"
		with open(output_path, "wb") as f: f.write(audio_bytes)
		return {"success": True, "avatar_id": req.avatar_model, "script": req.script, "source": "edge-tts", "audio_url": f"file://{output_path}", "bytes": len(audio_bytes)}
	except Exception as e: print(f"[GenerativeStudio] Avatar error: {e}")
	raise HTTPException(status_code=503, detail="Avatar unavailable — install edge-tts")
