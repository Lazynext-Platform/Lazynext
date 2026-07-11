"""Pydantic request/response models for the Pre-Processing service."""

from pydantic import BaseModel, Field


class VideoRequest(BaseModel):
    """Generic request referencing a video by ID."""
    video_id: str = Field(..., min_length=1, max_length=255, pattern=r'^[\w\-]+$')


class ProcessRequest(BaseModel):
    """Batch processing request with named operations (e.g. clean_audio, scene_detect)."""
    video_id: str = Field(..., min_length=1, max_length=255)
    operations: list[str] = Field(..., min_length=1, max_length=20)


class RotoscopeRequest(BaseModel):
    """SAM2 rotoscoping: isolate an object across a frame range."""
    video_id: str = Field(..., min_length=1, max_length=255)
    object_prompt: str = Field(default="person", min_length=1, max_length=500)
    frame_start: int = Field(default=0, ge=0)
    frame_end: int = Field(default=-1, ge=-1)


class NeRFRequest(BaseModel):
    """NeRF 3D reconstruction from video frames."""
    video_id: str = Field(..., min_length=1, max_length=255)
    method: str = Field(default="nerfacto", min_length=1, max_length=100)


class TrackRequest(BaseModel):
    """Motion tracking: follow a region-of-interest across frames."""
    video_id: str = Field(..., min_length=1, max_length=255)
    start_frame: int = Field(..., ge=0)
    end_frame: int = Field(..., ge=0)
    roi: list[float] = Field(..., min_length=4, max_length=4)


class ReframeRequest(BaseModel):
    """Auto-reframe: crop horizontal video to a target aspect ratio."""
    video_id: str = Field(..., min_length=1, max_length=255)
    target_aspect_ratio: str = Field(default="9:16", pattern=r'^\d+:\d+$')


class EnhanceAudioRequest(BaseModel):
    """Audio DSP: noise reduction, compression, EQ with a target profile."""
    video_id: str = Field(..., min_length=1, max_length=255)
    target_profile: str = Field(
        default="studio_podcast",
        pattern=r'^(studio_podcast|vocal_boost|broadcast|music_master)$'
    )


class RetouchRequest(BaseModel):
    """AI beauty retouching with adjustable intensity."""
    video_id: str = Field(..., min_length=1, max_length=255)
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)


class ExtractHookRequest(BaseModel):
    """Extract the most engaging segment for use as a viral hook."""
    video_id: str = Field(..., min_length=1, max_length=255)
    target_duration: float = Field(default=3.0, ge=0.5, le=60.0)


class ProxyRequest(BaseModel):
    """Generate low-resolution proxy files for smooth editing."""
    video_id: str = Field(..., min_length=1, max_length=255)
    proxy_quality: str = Field(
        default="720p_low",
        pattern=r'^(480p_low|720p_low|1080p_medium|540p_very_low)$'
    )


class IngestRequest(BaseModel):
    """Ingest a media file into a project, generating proxies and spritesheets."""
    file_path: str = Field(..., min_length=1, max_length=4096)
    project_id: str = Field(..., min_length=1, max_length=255)
