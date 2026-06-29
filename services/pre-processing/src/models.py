from pydantic import BaseModel

class VideoRequest(BaseModel):
    video_id: str

class ProcessRequest(BaseModel):
    video_id: str
    operations: list[str]

class RotoscopeRequest(BaseModel):
    video_id: str
    object_prompt: str = "person"
    frame_start: int = 0
    frame_end: int = -1

class NeRFRequest(BaseModel):
    video_id: str
    method: str = "nerfacto"

class TrackRequest(BaseModel):
    video_id: str
    start_frame: int
    end_frame: int
    roi: list[float]

class ReframeRequest(BaseModel):
    video_id: str
    target_aspect_ratio: str = "9:16"

class EnhanceAudioRequest(BaseModel):
    video_id: str
    target_profile: str = "studio_podcast"

class RetouchRequest(BaseModel):
    video_id: str
    intensity: float = 0.5

class ExtractHookRequest(BaseModel):
    video_id: str
    target_duration: float = 3.0

class ProxyRequest(BaseModel):
    video_id: str
    proxy_quality: str = "720p_low"

class IngestRequest(BaseModel):
    file_path: str
    project_id: str
