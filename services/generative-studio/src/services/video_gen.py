"""
Video generation services: diffusion via Fal.ai Kling, upscaling, style transfer,
generative fill, and AI avatar generation.

Uses Fal.ai + Kling 3.0 for text-to-video (best quality/price ratio),
RealESRGAN for upscaling, Edge TTS for avatar narration, and OpenCV-based
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

FAL_KLING_MODEL = os.getenv(
	"FAL_VIDEO_MODEL",
	"fal-ai/kling-video/o3/standard/text-to-video"
)
# Fallback: Wan 2.5 is cheaper ($0.05/sec), no special approval needed
FAL_WAN_MODEL = "fal-ai/wan-25-preview/text-to-video"
FAL_INPAINT_MODEL = os.getenv(
	"FAL_INPAINT_MODEL",
	"fal-ai/propainter"
)


async def generate_video_service(req: DiffusionRequest):
	"""Generate video from text via Fal.ai (Kling 3.0 → Wan 2.5 fallback).

	Tries Kling 3.0 first (best quality), falls back to Wan 2.5
	(cheaper, $0.05/sec, no special approval needed).

	Raises:
		HTTPException: 503 if FAL_KEY missing, 502 on API error.
	"""
	fal_key = os.getenv("FAL_KEY") or os.getenv("FAL_API_KEY")
	if not fal_key:
		raise HTTPException(status_code=503,
			detail="Video generation unavailable — FAL_KEY not configured")

	duration = (req.num_frames / 24.0) if req.num_frames > 0 else 5
	payload = {"prompt": req.prompt, "duration": str(duration), "aspect_ratio": "16:9"}

	async def try_model(model_id: str) -> dict:
		queue_url = f"https://queue.fal.run/{model_id}"
		async with httpx.AsyncClient() as client:
			resp = await client.post(queue_url,
				headers={"Authorization": f"Key {fal_key}", "Content-Type": "application/json"},
				json=payload, timeout=30.0)
			resp.raise_for_status()
			data = resp.json()
			return {
				"success": True, "prompt": req.prompt,
				"source": "fal-kling" if "kling" in model_id else "fal-wan",
				"request_id": data.get("request_id"),
				"status_url": f"https://queue.fal.run/{model_id}/requests/{data.get('request_id')}/status",
				"status": data.get("status", "IN_QUEUE"),
			}

	# Try Kling 3.0 first
	try:
		return await try_model(FAL_KLING_MODEL)
	except Exception as e:
		msg = str(e)
		if "403" in msg or "402" in msg or "locked" in msg.lower():
			print(f"[GenerativeStudio] Kling unavailable ({msg[:80]}), trying Wan 2.5...")
		else:
			print(f"[GenerativeStudio] Kling error: {msg[:100]}")

	# Fallback to Wan 2.5
	try:
		return await try_model(FAL_WAN_MODEL)
	except Exception as e:
		raise HTTPException(status_code=502,
			detail=f"Fal.ai API error: {e}")


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
	"""Fill masked regions in video using Fal.ai inpainting or local OpenCV.

	Falls back to local OpenCV Navier-Stokes inpainting when API key
	is not configured, or returns HTTP 503 when neither is available.
	"""
	video_path = f"/tmp/{req.video_id}.mp4"
	mask_path = f"/tmp/{req.video_id}_mask.png"
	output_path = f"/tmp/{req.video_id}_filled.mp4"

	fal_key = os.getenv("FAL_KEY") or os.getenv("FAL_API_KEY")

	if fal_key:
		try:
			async with httpx.AsyncClient() as client:
				queue_url = f"https://queue.fal.run/{FAL_INPAINT_MODEL}"
				response = await client.post(
					queue_url,
					headers={
						"Authorization": f"Key {fal_key}",
						"Content-Type": "application/json",
					},
					json={
						"video_url": f"file://{video_path}",
						"mask_url": f"file://{mask_path}" if os.path.exists(mask_path) else None,
						"prompt": req.prompt,
					},
					timeout=30.0,
				)
				response.raise_for_status()
				data = response.json()

				return {
					"success": True,
					"video_id": req.video_id,
					"source": "fal-inpaint",
					"request_id": data.get("request_id"),
					"status_url": f"https://queue.fal.run/{FAL_INPAINT_MODEL}/requests/{data.get('request_id')}/status",
				}
		except Exception as e:
			print(f"[GenerativeStudio] Fal.ai inpainting error: {e}")

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

			mask = None
			if os.path.exists(mask_path):
				mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
				if mask is not None:
					mask = cv2.resize(mask, (width, height))

			if mask is None:
				mask = np.zeros((height, width), dtype=np.uint8)
				if req.mask_coordinates:
					x1, y1, x2, y2 = [int(c) for c in req.mask_coordinates[:4]]
					mask[int(y1):int(y2), int(x1):int(x2)] = 255
				else:
					mask[height // 4:3 * height // 4, width // 4:3 * width // 4] = 255

			frames_dir = tempfile.mkdtemp(prefix="fill_")
			frame_idx = 0

			while True:
				ret, frame = cap.read()
				if not ret:
					break

				frame_mask = mask
				if frame_mask.shape[:2] != (frame.shape[0], frame.shape[1]):
					frame_mask = cv2.resize(mask, (frame.shape[1], frame.shape[0]))

				filled = cv2.inpaint(frame, frame_mask, inpaintRadius=3, flags=cv2.INPAINT_NS)

				frame_path = f"{frames_dir}/frame_{frame_idx:04d}.png"
				cv2.imwrite(frame_path, filled)
				frame_idx += 1

				if frame_idx >= 300:
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
		detail="Generative fill unavailable — configure FAL_KEY or install opencv-python with ffmpeg",
	)


async def generate_avatar_service(req: AvatarRequest):
	"""Generate an AI avatar video from text script using Edge TTS."""
	source = "edge-tts"

	try:
		from src.services.audio_gen import _edge_tts, _safe_slug

		audio_bytes = await _edge_tts(req.script, "en-US")
		output_path = f"/tmp/avatar_{_safe_slug(req.avatar_model, 'avatar')}.mp3"
		with open(output_path, "wb") as audio_file:
			audio_file.write(audio_bytes)
		return {
			"success": True,
			"avatar_id": req.avatar_model,
			"script": req.script,
			"source": source,
			"audio_url": f"file://{output_path}",
			"bytes": len(audio_bytes),
		}
	except Exception as e:
		print(f"[GenerativeStudio] Avatar generation error: {e}")

	raise HTTPException(
		status_code=503,
		detail="Avatar generation unavailable — install edge-tts: pip install edge-tts",
	)
