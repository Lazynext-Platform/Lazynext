"""
Image generation services: video/image inpainting via Modal GPU endpoints.

All generation is routed through Modal GPU endpoints — no local model loading.
Requires MODAL_INPAINT_ENDPOINT env var pointing to the deployed Modal app.
"""

import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import InpaintRequest


async def inpaint_video_service(req: InpaintRequest):
	"""Inpaint video/image via Modal GPU endpoint.

	Requires MODAL_INPAINT_ENDPOINT env var.
	Deploy the inpainting endpoint with:
	    modal deploy scripts/modal-inpaint.py

	Falls back to OpenCV CPU inpainting if Modal is unavailable.
	"""
	endpoint = os.getenv("MODAL_INPAINT_ENDPOINT", "")

	if not endpoint:
		raise HTTPException(
			status_code=503,
			detail="Inpainting unavailable — set MODAL_INPAINT_ENDPOINT. "
			"Deploy: modal deploy scripts/modal-inpaint.py",
		)

	try:
		async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
			resp = await client.post(
				endpoint,
				json={
					"video_id": req.video_id,
					"mask_url": req.mask_url,
					"prompt": req.prompt,
				},
			)
			resp.raise_for_status()
			data = resp.json()

			if not data.get("success"):
				raise HTTPException(
					status_code=502,
					detail=f"Modal inpainting error: {data.get('error', 'unknown')}",
				)

			return {
				"success": True,
				"video_id": req.video_id,
				"source": "modal-inpaint",
				"asset_url": data.get("asset_url"),
			}

	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(
			status_code=502, detail=f"Modal inpainting API error: {e}"
		)
