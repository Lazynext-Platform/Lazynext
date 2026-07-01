"""Pydantic request/response models for the Pre-Processing service."""

from pydantic import BaseModel

class VideoRequest(BaseModel):
    """Generic request referencing a video by ID."""
    video_id: str

class ProcessRequest(BaseModel):
    """Batch processing request with named operations (e.g. clean_audio, scene_detect)."""
    video_id: str
    operations: list[str]

class RotoscopeRequest(BaseModel):
    """SAM2 rotoscoping: isolate an object across a frame range."""
    video_id: str
    object_prompt: str = "person"
    frame_start: int = 0
    frame_end: int = -1

class NeRFRequest(BaseModel):
    """NeRF 3D reconstruction from video frames."""
    video_id: str
    method: str = "nerfacto"

class TrackRequest(BaseModel):
    """Motion tracking: follow a region-of-interest across frames."""
    video_id: str
    start_frame: int
    end_frame: int
    roi: list[float]

class ReframeRequest(BaseModel):
    """Auto-reframe: crop horizontal video to a target aspect ratio."""
    video_id: str
    target_aspect_ratio: str = "9:16"

class EnhanceAudioRequest(BaseModel):
    """Audio DSP: noise reduction, compression, EQ with a target profile."""
    video_id: str
    target_profile: str = "studio_podcast"

class RetouchRequest(BaseModel):
    """AI beauty retouching with adjustable intensity."""
    video_id: str
    intensity: float = 0.5

class ExtractHookRequest(BaseModel):
    """Extract the most engaging segment for use as a viral hook."""
    video_id: str
    target_duration: float = 3.0

class ProxyRequest(BaseModel):
    """Generate low-resolution proxy files for smooth editing."""
    video_id: str
    proxy_quality: str = "720p_low"

class IngestRequest(BaseModel):
    """Ingest a media file into a project, generating proxies and spritesheets."""
    file_path: str
    project_id: str
