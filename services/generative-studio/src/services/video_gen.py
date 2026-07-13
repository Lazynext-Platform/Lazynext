"""
Video generation services: text-to-video via Together AI + HF Spaces fallback,
upscaling, style transfer, generative fill, and AI avatar generation.

Together AI + Wan 2.2 for fast video ($0.66/video, ~30-60s).
HF Spaces fallback when no API key (free, 5-15 min).
RealESRGAN for upscaling, Edge TTS for avatars, OpenCV for effects.
"""

import asyncio
import os
import time
import httpx
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from src.models import (
	DiffusionRequest, UpscaleRequest, NeRFRequest,
	StyleTransferRequest, GenerativeFillRequest, AvatarRequest
)
from upscale_pipeline import UpscalePipeline, UpscaleConfig

TOGETHER_API = "https://api.together.ai/v1"
TOGETHER_VIDEO_MODEL = os.getenv("TOGETHER_VIDEO_MODEL", "Wan-AI/Wan2.2-TI2V-5B")


async def _generate_via_together(req: DiffusionRequest, api_key: str):
	payload = {
		"model": TOGETHER_VIDEO_MODEL,
		"prompt": req.prompt,
		"steps": min(req.num_frames if req.num_frames > 0 else 30, 50),
		"width": req.width,
		"height": req.height,
	}
	async with httpx.AsyncClient(timeout=120.0) as client:
		resp = await client.post(
			f"{TOGETHER_API}/images/generations",
			headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
			json=payload,
		)
		resp.raise_for_status()
		data = resp.json()
		output = data.get("output") or data.get("data", [{}])[0]
		video_url = output.get("url") if isinstance(output, dict) else (output if isinstance(output, str) else None)
		if not video_url and data.get("id"):
			for i in range(30):
				await asyncio.sleep(2)
				status = await client.get(f"{TOGETHER_API}/images/generations/{data['id']}", headers={"Authorization": f"Bearer {api_key}"})
				if status.status_code != 200: continue
				sd = status.json()
				so = sd.get("output") or sd.get("data", [{}])[0]
				video_url = so.get("url") if isinstance(so, dict) else (so if isinstance(so, str) else None)
				if video_url: break
		if not video_url:
			raise HTTPException(status_code=502, detail="Together AI returned no video URL")
		vr = await client.get(video_url)
		vr.raise_for_status()
		b = vr.content
		if len(b) < 1000: raise HTTPException(status_code=502, detail="Empty video")
		p = f"/tmp/generated_{hash(req.prompt)}.mp4"
		with open(p, "wb") as f: f.write(b)
		return {"success": True, "prompt": req.prompt, "source": "together-ai-wan22", "video_url": f"file://{p}"}


async def _generate_via_hf_spaces(req: DiffusionRequest):
	from gradio_client import Client
	client = Client("Wan-AI/Wan2.1")
	client.predict(prompt=req.prompt, api_name="/t2v_generation_async")
	for i in range(90):
		await asyncio.sleep(10)
		video, _cost, _wait, _prog = client.predict(api_name="/status_refresh")
		if video and isinstance(video, dict) and video.get("video"):
			vp = video["video"]
			if os.path.exists(vp):
				out = f"/tmp/generated_{hash(req.prompt)}.mp4"
				os.rename(vp, out)
				return {"success": True, "prompt": req.prompt, "source": "hf-spaces-wan21", "video_url": f"file://{out}"}
	raise HTTPException(status_code=504, detail="Video generation timed out (15 min)")


async def generate_video_service(req: DiffusionRequest):
	"""Generate video via Together AI (fast) or HF Spaces (free fallback)."""
	api_key = os.getenv("TOGETHER_API_KEY", "")

	if api_key:
		try:
			return await _generate_via_together(req, api_key)
		except HTTPException:
			raise
		except Exception as e:
			print(f"[GenerativeStudio] Together AI error: {e}, trying HF Spaces...")

	print("[GenerativeStudio] Using HF Spaces fallback (free, slower)...")
	try:
		return await _generate_via_hf_spaces(req)
	except ImportError:
		raise HTTPException(status_code=503, detail="install gradio_client or set TOGETHER_API_KEY")
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Video generation failed: {e}")


async def upscale_video_service(req: UpscaleRequest):
	"""Upscale video resolution using RealESRGAN (2x or 4x)."""
	video_path = f"/tmp/{req.video_id}.mp4"
	output_path = f"/tmp/{req.video_id}_{req.scale}x.mp4"
	config = UpscaleConfig(scale=req.scale, model="RealESRGAN_x4plus" if req.scale == 4 else "RealESRGAN_x2plus")
	pipeline = UpscalePipeline(config)
	loop = asyncio.get_running_loop()
	result = await loop.run_in_executor(None, pipeline.upscale, video_path, output_path)
	if not result.success:
		raise HTTPException(status_code=503, detail=f"Upscaling unavailable: {result.error}")
	return {"success": True, "video_id": req.video_id, "scale": req.scale, "source": result.model, "output_url": f"file://{result.output_path}"}


async def extract_nerf_service(req: NeRFRequest):
	"""Deprecated NeRF endpoint — returns 410 Gone."""
	return JSONResponse(status_code=410, content={"success": False, "error": "Use /nerf-extract on pre-processing service (port 8000).", "video_id": req.video_id}, headers={"Deprecation": "true", "Sunset": "Sat, 01 Aug 2026 00:00:00 GMT"})


async def style_transfer_service(req: StyleTransferRequest):
	"""Apply visual style transfer via OpenCV effects."""
	video_path = f"/tmp/{req.video_id}.mp4"
	output_path = f"/tmp/{req.video_id}_styled.mp4"
	if not os.path.exists(video_path):
		raise HTTPException(status_code=500, detail="Style transfer failed — video not found")
	try:
		import cv2, numpy as np, subprocess, tempfile
		cap = cv2.VideoCapture(video_path)
		if not cap.isOpened(): raise HTTPException(status_code=400, detail="Cannot open video")
		fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
		total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
		step = max(1, total // 30)
		td = tempfile.mkdtemp(prefix="style_")
		oi = 0; fi = 0
		while True:
			ret, frame = cap.read()
			if not ret: break
			if fi % step == 0:
				sp = req.style_prompt.lower()
				if "anime" in sp:
					g = cv2.medianBlur(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), 5)
					e = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
					c = cv2.bilateralFilter(frame, 9, 300, 300)
					styled = cv2.bitwise_and(c, c, mask=e)
				elif "clay" in sp: styled = cv2.stylization(frame, sigma_s=60, sigma_r=0.6)
				elif "pencil" in sp or "sketch" in sp:
					g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
					inv = 255 - g; blur = cv2.GaussianBlur(inv, (21, 21), 0)
					styled = cv2.cvtColor(cv2.divide(g, 255 - blur, scale=256.0), cv2.COLOR_GRAY2BGR)
				else: styled = cv2.detailEnhance(frame, sigma_s=10, sigma_r=0.15)
				cv2.imwrite(f"{td}/frame_{oi:04d}.png", styled); oi += 1
			fi += 1
			if oi >= 30: break
		cap.release()
		if oi > 0:
			r = subprocess.run(["ffmpeg", "-y", "-framerate", str(fps/step), "-i", f"{td}/frame_%04d.png", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", output_path], capture_output=True, timeout=300)
			import shutil; shutil.rmtree(td, ignore_errors=True)
			if r.returncode == 0:
				return {"success": True, "video_id": req.video_id, "style_applied": req.style_prompt, "source": "opencv_stylization", "styled_video_url": f"file://{output_path}"}
	except ImportError: raise HTTPException(status_code=503, detail="OpenCV not installed")
	except Exception as e: raise HTTPException(status_code=500, detail=f"Style transfer error: {e}")
	raise HTTPException(status_code=500, detail="Style transfer failed internally")


async def generative_fill_service(req: GenerativeFillRequest):
	"""Fill masked regions using OpenCV inpainting."""
	video_path = f"/tmp/{req.video_id}.mp4"
	mask_path = f"/tmp/{req.video_id}_mask.png"
	output_path = f"/tmp/{req.video_id}_filled.mp4"
	if not os.path.exists(video_path):
		raise HTTPException(status_code=503, detail="Video not found")
	try:
		import cv2, numpy as np, subprocess, tempfile
		cap = cv2.VideoCapture(video_path)
		if not cap.isOpened(): raise HTTPException(status_code=400, detail="Cannot open video")
		fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
		w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
		mask = None
		if os.path.exists(mask_path): mask = cv2.resize(cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE), (w, h)) if cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE) is not None else None
		if mask is None:
			mask = np.zeros((h, w), dtype=np.uint8)
			if req.mask_coordinates:
				x1, y1, x2, y2 = [int(c) for c in req.mask_coordinates[:4]]; mask[y1:y2, x1:x2] = 255
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
			if r.returncode == 0:
				return {"success": True, "video_id": req.video_id, "source": "opencv_inpaint", "filled_video_url": f"file://{output_path}"}
	except ImportError: print("[GenerativeStudio] OpenCV not available")
	except Exception as e: print(f"[GenerativeStudio] OpenCV error: {e}")
	raise HTTPException(status_code=503, detail="Generative fill unavailable — install opencv-python-headless")


async def generate_avatar_service(req: AvatarRequest):
	"""Generate AI avatar from text via Edge TTS."""
	try:
		from src.services.audio_gen import _edge_tts, _safe_slug
		audio_bytes = await _edge_tts(req.script, "en-US")
		output_path = f"/tmp/avatar_{_safe_slug(req.avatar_model, 'avatar')}.mp3"
		with open(output_path, "wb") as f: f.write(audio_bytes)
		return {"success": True, "avatar_id": req.avatar_model, "script": req.script, "source": "edge-tts", "audio_url": f"file://{output_path}", "bytes": len(audio_bytes)}
	except Exception as e: print(f"[GenerativeStudio] Avatar error: {e}")
	raise HTTPException(status_code=503, detail="Avatar unavailable — install edge-tts")
