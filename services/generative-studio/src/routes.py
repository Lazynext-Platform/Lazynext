"""
Generative Studio REST API routes.

Exposes endpoints for AI media generation: video diffusion, inpainting,
dubbing, overdubbing, stem splitting, upscaling, NeRF, style transfer,
generative fill, and avatar generation.
"""

from fastapi import APIRouter
from src.models import (
    DiffusionRequest, DubRequest, OverdubRequest, StyleTransferRequest,
    GenerativeFillRequest, AvatarRequest, NeRFRequest, StemSplitRequest,
    UpscaleRequest, InpaintRequest
)
from src.services.video_gen import (
    generate_video_service, upscale_video_service, extract_nerf_service,
    style_transfer_service, generative_fill_service, generate_avatar_service
)
from src.services.audio_gen import (
    dub_video_service, overdub_audio_service, split_stems_service
)
from src.services.image_gen import inpaint_video_service

router = APIRouter()

@router.get("/")
def read_root():
    return {"status": "ok", "service": "generative-studio"}

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "generative-studio"}

@router.post("/generate-video")
async def generate_video(req: DiffusionRequest):
    return await generate_video_service(req)

@router.post("/inpaint")
async def inpaint_video(req: InpaintRequest):
    return await inpaint_video_service(req)

@router.post("/dub")
async def dub_video(req: DubRequest):
    return await dub_video_service(req)

@router.post("/overdub")
async def overdub_audio(req: OverdubRequest):
    return await overdub_audio_service(req)

@router.post("/split-stems")
async def split_stems(req: StemSplitRequest):
    return await split_stems_service(req)

@router.post("/upscale")
async def upscale_video(req: UpscaleRequest):
    return await upscale_video_service(req)

@router.post("/nerf-extract")
async def extract_nerf(req: NeRFRequest):
    return await extract_nerf_service(req)

@router.post("/style-transfer")
async def style_transfer(req: StyleTransferRequest):
    return await style_transfer_service(req)

@router.post("/generative-fill")
async def generative_fill(req: GenerativeFillRequest):
    return await generative_fill_service(req)

@router.post("/generate-avatar")
async def generate_avatar(req: AvatarRequest):
    return await generate_avatar_service(req)
