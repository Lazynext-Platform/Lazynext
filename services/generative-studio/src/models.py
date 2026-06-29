from pydantic import BaseModel

class DiffusionRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 576
    num_frames: int = 24

class DubRequest(BaseModel):
    clip_id: str
    target_language: str
    text_to_dub: str = "This is a placeholder text to dub."

class OverdubRequest(BaseModel):
    text: str
    voice_id: str = "default_voice"
    original_audio_url: str | None = None

class StyleTransferRequest(BaseModel):
    video_id: str
    style_prompt: str = "anime style, Studio Ghibli, 4k"

class GenerativeFillRequest(BaseModel):
    video_id: str
    prompt: str = "add a spaceship"
    mask_coordinates: list[float] = [100.0, 100.0, 200.0, 200.0]

class AvatarRequest(BaseModel):
    script: str
    voice_id: str = "default_avatar_voice"
    avatar_model: str = "realistic_human_1"

class NeRFRequest(BaseModel):
    video_id: str

class StemSplitRequest(BaseModel):
    audio_id: str
    stems: int = 4  # 2, 4, or 5

class UpscaleRequest(BaseModel):
    video_id: str
    scale: int = 2  # 2x or 4x

class InpaintRequest(BaseModel):
    video_id: str
    mask_url: str
    prompt: str
