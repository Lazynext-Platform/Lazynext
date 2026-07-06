"""
Pre-Processing REST API routes.

Exposes endpoints for media analysis and transformation:
transcription, scene detection, motion tracking, rotoscoping,
NeRF extraction, auto-reframing, audio enhancement, retouching,
hook extraction, proxy generation, and media ingestion.
"""

from fastapi import APIRouter
from src.models import (
    VideoRequest, EnhanceAudioRequest, ProcessRequest,
    TrackRequest, ReframeRequest, RetouchRequest,
    ExtractHookRequest, ProxyRequest, IngestRequest,
    RotoscopeRequest, NeRFRequest
)
from src.services.audio_analysis import (
    transcribe_audio_service, enhance_audio_service
)
from src.services.video_analysis import (
    process_video_service, track_motion_service,
    auto_reframe_service, retouch_service,
    extract_hook_service, generate_proxies_service,
    ingest_media_service
)
from src.services.cv_models import (
    rotoscope_service, extract_nerf_service
)

router = APIRouter()

@router.get("/")
def read_root():
    """Health check endpoint returning service status."""
    return {"status": "ok", "service": "pre-processing"}

@router.post("/transcribe")
async def transcribe_audio(req: VideoRequest):
    """Transcribe audio from a video via Whisper speech-to-text."""
    return await transcribe_audio_service(req)

@router.post("/process")
async def process_video(req: ProcessRequest):
    """Run full video analysis pipeline (scene detection, transcription, etc.)."""
    return await process_video_service(req)

@router.post("/rotoscope")
async def rotoscope(req: RotoscopeRequest):
    """Extract alpha masks from video using SAM2 rotoscoping."""
    return await rotoscope_service(req)

@router.post("/nerf-extract")
async def extract_nerf(req: NeRFRequest):
    """Extract a NeRF or 3D Gaussian Splat from input frames."""
    return await extract_nerf_service(req)

@router.post("/track")
async def track_motion(req: TrackRequest):
    """Track object motion across video frames."""
    return await track_motion_service(req)

@router.post("/auto-reframe")
async def auto_reframe(req: ReframeRequest):
    """Auto-reframe video for different aspect ratios based on saliency."""
    return await auto_reframe_service(req)

@router.post("/enhance-audio")
async def enhance_audio(req: EnhanceAudioRequest):
    """Enhance audio quality via DSP (noise reduction, EQ, leveling)."""
    return await enhance_audio_service(req)

@router.post("/retouch")
async def retouch(req: RetouchRequest):
    """Apply AI-powered cosmetic retouching to video frames."""
    return await retouch_service(req)

@router.post("/extract-hook")
async def extract_hook(req: ExtractHookRequest):
    """Extract the most engaging short clip (hook) from a video."""
    return await extract_hook_service(req)

@router.post("/generate-proxies")
async def generate_proxies(req: ProxyRequest):
    """Generate low-resolution proxy files for faster editing."""
    return await generate_proxies_service(req)

@router.post("/ingest")
async def ingest_media(req: IngestRequest):
    """Ingest media files into the system with metadata extraction."""
    return await ingest_media_service(req)
