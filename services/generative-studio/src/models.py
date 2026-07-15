"""Pydantic request/response models for the Generative Studio service."""

from pydantic import BaseModel, Field


class DiffusionRequest(BaseModel):
    """Text-to-video generation request (via Modal SD Pipeline)."""
    prompt: str = Field(..., min_length=1, max_length=4000)
    width: int = Field(default=1024, ge=64, le=2048, multiple_of=8)
    height: int = Field(default=576, ge=64, le=2048, multiple_of=8)
    num_frames: int = Field(default=24, ge=1, le=240)


class DubRequest(BaseModel):
    """AI dubbing: generate speech in a target language via Edge TTS."""
    clip_id: str = Field(..., min_length=1, max_length=255)
    target_language: str = Field(..., min_length=1, max_length=50)
    text_to_dub: str = Field(default="This is a placeholder text to dub.", max_length=5000)


class OverdubRequest(BaseModel):
    """Voice-cloned overdubbing: replace or insert speech via F5-TTS."""
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: str = Field(default="default_voice", min_length=1, max_length=100)
    original_audio_url: str | None = Field(default=None, max_length=4096)


class StyleTransferRequest(BaseModel):
    """Apply a generative visual style to a video (e.g. anime, claymation)."""
    video_id: str = Field(..., min_length=1, max_length=255)
    style_prompt: str = Field(default="anime style, Studio Ghibli, 4k", min_length=1, max_length=500)


class GenerativeFillRequest(BaseModel):
    """Inpaint or add objects in video frames using generative AI."""
    video_id: str = Field(..., min_length=1, max_length=255)
    prompt: str = Field(default="add a spaceship", min_length=1, max_length=500)
    mask_coordinates: list[float] = Field(
        default=[100.0, 100.0, 200.0, 200.0],
        min_length=4,
        max_length=4
    )


class AvatarRequest(BaseModel):
    """Generate a lip-synced digital human avatar from a text script using Edge TTS."""
    script: str = Field(..., min_length=1, max_length=10000)
    voice_id: str = Field(default="default_avatar_voice", min_length=1, max_length=100)
    avatar_model: str = Field(default="realistic_human_1", min_length=1, max_length=100)


class NeRFRequest(BaseModel):
    """NeRF 3D reconstruction request (redirects to pre-processing)."""
    video_id: str = Field(..., min_length=1, max_length=255)


class StemSplitRequest(BaseModel):
    """Separate audio into vocal/instrumental stems (2, 4, or 5 stems)."""
    audio_id: str = Field(..., min_length=1, max_length=255)
    stems: int = Field(default=4, ge=2, le=5)


class UpscaleRequest(BaseModel):
    """Upscale video resolution using RealESRGAN (2x or 4x)."""
    video_id: str = Field(..., min_length=1, max_length=255)
    scale: int = Field(default=2, ge=2, le=4, multiple_of=2)


class InpaintRequest(BaseModel):
    """Inpaint a masked region in a video via Modal GPU endpoint."""
    video_id: str = Field(..., min_length=1, max_length=255)
    mask_url: str = Field(..., min_length=1, max_length=4096)
    prompt: str = Field(..., min_length=1, max_length=500)
