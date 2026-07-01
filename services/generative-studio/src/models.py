"""Pydantic request/response models for the Generative Studio service."""

from pydantic import BaseModel

class DiffusionRequest(BaseModel):
    """Stable Video Diffusion generation request (via Replicate)."""
    prompt: str
    width: int = 1024
    height: int = 576
    num_frames: int = 24

class DubRequest(BaseModel):
    """AI dubbing: generate speech in a target language for a clip."""
    clip_id: str
    target_language: str
    text_to_dub: str = "This is a placeholder text to dub."

class OverdubRequest(BaseModel):
    """Voice-cloned overdubbing: replace or insert speech segments."""
    text: str
    voice_id: str = "default_voice"
    original_audio_url: str | None = None

class StyleTransferRequest(BaseModel):
    """Apply a generative visual style to a video (e.g. anime, claymation)."""
    video_id: str
    style_prompt: str = "anime style, Studio Ghibli, 4k"

class GenerativeFillRequest(BaseModel):
    """Inpaint or add objects in video frames using generative AI."""
    video_id: str
    prompt: str = "add a spaceship"
    mask_coordinates: list[float] = [100.0, 100.0, 200.0, 200.0]

class AvatarRequest(BaseModel):
    """Generate a lip-synced digital human avatar from a text script."""
    script: str
    voice_id: str = "default_avatar_voice"
    avatar_model: str = "realistic_human_1"

class NeRFRequest(BaseModel):
    """NeRF 3D reconstruction request (redirects to pre-processing)."""
    video_id: str

class StemSplitRequest(BaseModel):
    """Separate audio into vocal/instrumental stems (2, 4, or 5 stems)."""
    audio_id: str
    stems: int = 4  # 2, 4, or 5

class UpscaleRequest(BaseModel):
    """Upscale video resolution using RealESRGAN (2x or 4x)."""
    video_id: str
    scale: int = 2  # 2x or 4x

class InpaintRequest(BaseModel):
    """Inpaint a masked region in a video using Stable Diffusion."""
    video_id: str
    mask_url: str
    prompt: str
