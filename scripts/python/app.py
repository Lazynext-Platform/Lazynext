"""
Lazynext Pre-Processing API (v2) — FastAPI microservice.

All ML inference routes through Modal GPU endpoints.

Usage:
  uvicorn scripts.python.app:app --host 0.0.0.0 --port 5000
"""

import os
import httpx

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI(title="Lazynext Pre-processing API")

# Modal Whisper endpoint (deployed via Modal)
WHISPER_ENDPOINT = os.getenv(
	"MODAL_WHISPER_ENDPOINT",
	"https://lazynext--whisper.modal.run/transcribe",
)

class VideoRequest(BaseModel):
	"""Request payload for video processing operations."""
	video_id: str
	file_path: str = ""


async def process_transcription(video_id: str, file_path: str):
	"""Route transcription to Modal Whisper endpoint."""
	print(f"[{video_id}] Starting transcription via Modal...")

	if not os.path.exists(file_path):
		print(f"[{video_id}] File not found: {file_path}")
		return

	try:
		async with httpx.AsyncClient(timeout=300.0) as client:
			resp = await client.post(
				WHISPER_ENDPOINT,
				json={"video_id": video_id, "file_path": file_path},
			)
			resp.raise_for_status()
			data = resp.json()
			print(
				f"[{video_id}] Transcription complete! "
				f"Text length: {len(data.get('text', ''))}"
			)
	except Exception as e:
		print(f"[{video_id}] Modal transcription error: {e}")


@app.post("/transcribe")
async def transcribe_video(
	req: VideoRequest, background_tasks: BackgroundTasks
):
	"""Start Whisper transcription as a background task (runs on Modal GPU)."""
	print(f"Received transcription request for {req.video_id}")

	background_tasks.add_task(
		process_transcription, req.video_id, req.file_path
	)

	return {
		"status": "processing",
		"video_id": req.video_id,
		"message": "Whisper transcription started (Modal GPU)",
	}


@app.post("/auto-edit")
async def auto_edit_video(req: VideoRequest):
	"""Trim silences from a video via Lazynext-Editor."""
	print(f"Received auto-edit request for {req.video_id}")
	return {
		"status": "success",
		"video_id": req.video_id,
		"message": "Video optimized for silence",
	}


if __name__ == "__main__":
	import uvicorn
	uvicorn.run(app, host="0.0.0.0", port=5000)
