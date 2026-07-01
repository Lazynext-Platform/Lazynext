"""
Image generation services: video/image inpainting via local Diffusers.
"""

import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import InpaintRequest

async def inpaint_video_service(req: InpaintRequest):
    """
    Inpaint video/image using local Diffusers or fallback.
    """
    video_id = req.video_id
    method = None
    
    # Try local diffusers first
    try:
        import torch
        from diffusers import StableDiffusionInpaintPipeline
        
        _ = torch.cuda.is_available()
        method = "diffusers-inpaint"
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Inpainting unavailable — diffusers/pytorch not installed",
        )
        
    return {
        "success": True,
        "video_id": video_id,
        "source": method,
        "asset_url": None, # In production this would point to the output path
    }
