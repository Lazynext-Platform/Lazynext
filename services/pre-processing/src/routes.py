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
    return {"status": "ok", "service": "pre-processing"}

@router.post("/transcribe")
async def transcribe_audio(req: VideoRequest):
    return await transcribe_audio_service(req)

@router.post("/process")
async def process_video(req: ProcessRequest):
    return await process_video_service(req)

@router.post("/rotoscope")
async def rotoscope(req: RotoscopeRequest):
    return await rotoscope_service(req)

@router.post("/nerf-extract")
async def extract_nerf(req: NeRFRequest):
    return await extract_nerf_service(req)

@router.post("/track")
async def track_motion(req: TrackRequest):
    return await track_motion_service(req)

@router.post("/auto-reframe")
async def auto_reframe(req: ReframeRequest):
    return await auto_reframe_service(req)

@router.post("/enhance-audio")
async def enhance_audio(req: EnhanceAudioRequest):
    return await enhance_audio_service(req)

@router.post("/retouch")
async def retouch(req: RetouchRequest):
    return await retouch_service(req)

@router.post("/extract-hook")
async def extract_hook(req: ExtractHookRequest):
    return await extract_hook_service(req)

@router.post("/generate-proxies")
async def generate_proxies(req: ProxyRequest):
    return await generate_proxies_service(req)

@router.post("/ingest")
async def ingest_media(req: IngestRequest):
    return await ingest_media_service(req)
