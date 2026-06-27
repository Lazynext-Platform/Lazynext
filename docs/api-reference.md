# Lazynext API Reference

Complete reference for all microservice endpoints across the Lazynext platform. All services communicate over the `lazynext-network` Docker bridge. Base URLs default to `http://localhost:<port>` locally.

---

## Pre-Processing Service (Port 8000)

Python FastAPI service providing media ingestion, transcription, rotoscoping, and tracking. Base URL: `http://localhost:8000`

### POST /transcribe

Transcribe audio from a video or audio file using OpenAI Whisper.

**URL**: `POST /transcribe`

**Request Body** (multipart/form-data):
```json
{
  "file": "<binary_file>",
  "model": "large-v3",
  "language": "en",
  "response_format": "verbose_json",
  "word_timestamps": true
}
```

**Response** (200):
```json
{
  "status": "completed",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 2.34,
      "text": "Welcome to this video.",
      "words": [
        {"word": "Welcome", "start": 0.0, "end": 0.52},
        {"word": "to", "start": 0.52, "end": 0.68},
        {"word": "this", "start": 0.68, "end": 0.91},
        {"word": "video.", "start": 0.91, "end": 2.34}
      ],
      "confidence": 0.98
    }
  ],
  "language": "en",
  "duration": 120.5
}
```

**Response** (400):
```json
{
  "error": "Unsupported file format",
  "detail": "Accepted formats: mp4, wav, mp3, mov, mkv, webm"
}
```

**Response** (413):
```json
{
  "error": "File too large",
  "detail": "Maximum file size is 2GB"
}
```

---

### POST /process

Run the full pre-processing pipeline: scene detection, silence detection, and clip tagging via the neural engine.

**URL**: `POST /process`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/input.mp4",
  "project_id": "proj_abc123",
  "operations": ["scene_detect", "silence_detect", "tag_clips"],
  "scene_threshold": 30,
  "silence_threshold_db": -40,
  "min_silence_duration_ms": 500
}
```

**Response** (200):
```json
{
  "status": "processing",
  "job_id": "job_7f3a2b",
  "operations": {
    "scene_detect": {"status": "queued"},
    "silence_detect": {"status": "queued"},
    "tag_clips": {"status": "queued"}
  },
  "estimated_duration_seconds": 45
}
```

**Response** (200) — after completion:
```json
{
  "status": "completed",
  "job_id": "job_7f3a2b",
  "scenes": [
    {"index": 0, "start_frame": 0, "end_frame": 142, "duration_ms": 4733},
    {"index": 1, "start_frame": 143, "end_frame": 310, "duration_ms": 5567}
  ],
  "silence_regions": [
    {"start_ms": 1200, "end_ms": 1800, "confidence": 0.95}
  ],
  "clip_tags": [
    {"clip_index": 0, "tags": ["outdoor", "daylight", "person"], "confidence": 0.87}
  ],
  "duration_seconds": 10.3
}
```

---

### POST /rotoscope

Run SAM2 (Segment Anything Model 2) rotoscoping to extract masks from video frames.

**URL**: `POST /rotoscope`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/input.mp4",
  "points": [
    {"x": 320, "y": 240, "label": 1}
  ],
  "frame_index": 0,
  "propagate": true,
  "invert_mask": false,
  "feather_px": 2
}
```

**Response** (200):
```json
{
  "status": "completed",
  "mask_url": "s3://bucket/masks/proj_abc123_frame_0.png",
  "mask_sequence_url": "s3://bucket/masks/proj_abc123/",
  "frame_count": 300,
  "bbox": {"x": 120, "y": 80, "width": 400, "height": 300}
}
```

**Response** (422):
```json
{
  "error": "No maskable object found",
  "detail": "No object detected at the provided points"
}
```

---

### POST /ingest

Ingest media from a URL or direct upload into the processing pipeline. Handles format normalization and proxy generation.

**URL**: `POST /ingest`

**Request Body** (application/json):
```json
{
  "source_url": "https://example.com/video.mp4",
  "project_id": "proj_abc123",
  "generate_proxies": true,
  "proxy_resolution": "1080p",
  "extract_metadata": true
}
```

**Response** (201):
```json
{
  "status": "ingested",
  "asset_id": "asset_d4e5f6",
  "original": {
    "url": "s3://bucket/originals/asset_d4e5f6.mp4",
    "duration_ms": 45000,
    "width": 3840,
    "height": 2160,
    "codec": "h264",
    "bitrate_bps": 50000000,
    "fps": 29.97
  },
  "proxies": {
    "1080p": "s3://bucket/proxies/asset_d4e5f6_1080p.mp4",
    "540p": "s3://bucket/proxies/asset_d4e5f6_540p.mp4"
  },
  "thumbnail_url": "s3://bucket/thumbnails/asset_d4e5f6.jpg"
}
```

**Response** (409):
```json
{
  "error": "Duplicate asset",
  "detail": "Asset with same content hash already exists: asset_abc123"
}
```

---

### POST /track

Track an object across video frames using point or box initialization. Returns bounding boxes and keypoint trajectories.

**URL**: `POST /track`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/input.mp4",
  "track_type": "bbox",
  "initial_bbox": {"x": 100, "y": 150, "width": 200, "height": 200},
  "start_frame": 0,
  "end_frame": 300,
  "tracker": "cotracker_v2"
}
```

**Response** (200):
```json
{
  "status": "completed",
  "trajectory": [
    {"frame": 0, "bbox": {"x": 100, "y": 150, "width": 200, "height": 200}, "confidence": 0.99},
    {"frame": 1, "bbox": {"x": 102, "y": 148, "width": 198, "height": 202}, "confidence": 0.98}
  ],
  "tracked_frames": 300,
  "average_confidence": 0.94
}
```

---

## Generative Studio Service (Port 8001)

Python FastAPI service for AI-driven content generation. Base URL: `http://localhost:8001`

### POST /generate-video

Generate video from text prompt, image, or existing video using Stable Video Diffusion.

**URL**: `POST /generate-video`

**Request Body** (application/json):
```json
{
  "prompt": "A cinematic drone shot over a misty forest at sunrise, 4K",
  "negative_prompt": "blurry, low quality, watermark",
  "duration_frames": 24,
  "fps": 24,
  "width": 1024,
  "height": 576,
  "seed": 42,
  "cfg_scale": 7.5,
  "motion_bucket_id": 127,
  "input_image_url": null,
  "input_video_url": null
}
```

**Response** (200):
```json
{
  "status": "completed",
  "output_url": "s3://generated/video_gen_8a9b0c.mp4",
  "duration_frames": 24,
  "seed": 42,
  "generation_time_seconds": 18.3,
  "model": "stable-video-diffusion-img2vid-xt"
}
```

**Response** (402):
```json
{
  "error": "Insufficient credits",
  "detail": "This generation requires 10 credits. You have 3 remaining."
}
```

---

### POST /dub

Dub audio track using ElevenLabs voice synthesis with optional lip-sync alignment.

**URL**: `POST /dub`

**Request Body** (application/json):
```json
{
  "text": "Hello and welcome to this tutorial.",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "source_language": "en",
  "target_language": "es",
  "model": "eleven_multilingual_v2",
  "stability": 0.5,
  "similarity_boost": 0.75,
  "align_to_video": false
}
```

**Response** (200):
```json
{
  "status": "completed",
  "audio_url": "s3://dub/audio_gen_1f2e3d.mp3",
  "duration_seconds": 3.4,
  "characters": 42,
  "language": "es"
}
```

---

### POST /split-stems

Split audio into individual stems using Demucs (vocals, drums, bass, other).

**URL**: `POST /split-stems`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/audio.mp3",
  "model": "htdemucs_6s",
  "stems": ["vocals", "drums", "bass", "other", "guitar", "piano"],
  "output_format": "wav"
}
```

**Response** (200):
```json
{
  "status": "completed",
  "stems": {
    "vocals": "s3://stems/audio/vocals.wav",
    "drums": "s3://stems/audio/drums.wav",
    "bass": "s3://stems/audio/bass.wav",
    "other": "s3://stems/audio/other.wav",
    "guitar": "s3://stems/audio/guitar.wav",
    "piano": "s3://stems/audio/piano.wav"
  },
  "model": "htdemucs_6s",
  "processing_time_seconds": 12.7
}
```

**Response** (400):
```json
{
  "error": "Invalid stem selection",
  "detail": "Requested stems ['violin'] not available. Available: vocals, drums, bass, other, guitar, piano"
}
```

---

### POST /upscale

Upscale video using ESRGAN or Real-ESRGAN models.

**URL**: `POST /upscale`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/input.mp4",
  "scale_factor": 4,
  "model": "realesrgan-x4plus",
  "face_enhance": true,
  "denoise_strength": 0.5,
  "output_format": "mp4"
}
```

**Response** (200):
```json
{
  "status": "completed",
  "output_url": "s3://upscaled/video_4x.mp4",
  "original_resolution": {"width": 1920, "height": 1080},
  "output_resolution": {"width": 7680, "height": 4320},
  "processing_time_seconds": 340.2
}
```

---

### POST /style-transfer

Apply artistic style transfer to video frames.

**URL**: `POST /style-transfer`

**Request Body** (application/json):
```json
{
  "source_url": "s3://bucket/input.mp4",
  "style_reference_url": "s3://bucket/style.jpg",
  "style_strength": 0.7,
  "temporal_consistency": true,
  "preserve_color": false
}
```

**Response** (200):
```json
{
  "status": "completed",
  "output_url": "s3://styled/video_styled.mp4",
  "style_reference": "s3://bucket/style.jpg",
  "processing_time_seconds": 120.5,
  "frames_processed": 240
}
```

---

## Render Service (Port 8003)

Node.js (Bun) render farm service with FFMPEG encoding pipeline. Base URL: `http://localhost:8003`

### POST /jobs

Submit a new render job. Returns immediately with a job ID; progress is streamed via SSE.

**URL**: `POST /jobs`

**Request Body** (application/json):
```json
{
  "project_id": "proj_abc123",
  "output": {
    "format": "mp4",
    "codec": "h264",
    "width": 1920,
    "height": 1080,
    "fps": 29.97,
    "bitrate_bps": 25000000,
    "preset": "medium",
    "profile": "high",
    "audio_codec": "aac",
    "audio_bitrate_bps": 320000
  },
  "in_point_ms": 0,
  "out_point_ms": 30000,
  "priority": "normal",
  "webhook_url": "https://api.example.com/render-callback"
}
```

**Response** (201):
```json
{
  "job_id": "render_4a5b6c",
  "status": "queued",
  "estimated_duration_seconds": 45,
  "queue_position": 3,
  "created_at": "2026-06-27T10:30:00Z"
}
```

**Response** (400):
```json
{
  "error": "Invalid output format",
  "detail": "Format 'avi' is not supported. Supported: mp4, mov, prores, dcp, aaf"
}
```

---

### POST /export

Submit an export job with preset configurations for common delivery targets.

**URL**: `POST /export`

**Request Body** (application/json):
```json
{
  "project_id": "proj_abc123",
  "preset": "youtube_4k",
  "presets_available": [
    "youtube_4k",
    "youtube_1080p",
    "instagram_reel",
    "tiktok",
    "broadcast_prores",
    "dcp_2k",
    "aaf_avid"
  ],
  "watermark": false,
  "burn_subtitles": true
}
```

**Response** (201):
```json
{
  "job_id": "render_7c8d9e",
  "status": "queued",
  "output": {
    "format": "mp4",
    "codec": "h264",
    "width": 3840,
    "height": 2160,
    "fps": 30,
    "bitrate_bps": 45000000
  },
  "estimated_duration_seconds": 120
}
```

---

### GET /stream/:job_id

Stream render progress via Server-Sent Events (SSE).

**URL**: `GET /stream/render_4a5b6c`

**Response** (text/event-stream):
```
event: progress
data: {"job_id":"render_4a5b6c","status":"rendering","percent":42.5,"frame":102,"total_frames":240,"eta_seconds":18}

event: progress
data: {"job_id":"render_4a5b6c","status":"rendering","percent":67.0,"frame":161,"total_frames":240,"eta_seconds":10}

event: complete
data: {"job_id":"render_4a5b6c","status":"completed","output_url":"s3://renders/proj_abc123/render_4a5b6c.mp4","file_size_bytes":524288000,"duration_ms":30000,"render_time_seconds":32.1}
```

**Response** (404):
```
event: error
data: {"error":"Job not found","detail":"No render job with ID render_xyz"}
```

---

### GET /jobs/:job_id

Get the current status of a render job.

**URL**: `GET /jobs/render_4a5b6c`

**Response** (200):
```json
{
  "job_id": "render_4a5b6c",
  "status": "completed",
  "output_url": "s3://renders/proj_abc123/render_4a5b6c.mp4",
  "format": "mp4",
  "file_size_bytes": 524288000,
  "duration_ms": 30000,
  "render_time_seconds": 32.1,
  "created_at": "2026-06-27T10:30:00Z",
  "completed_at": "2026-06-27T10:30:32Z"
}
```

---

### DELETE /jobs/:job_id

Cancel a queued or in-progress render job.

**URL**: `DELETE /jobs/render_4a5b6c`

**Response** (200):
```json
{
  "job_id": "render_4a5b6c",
  "status": "cancelled",
  "cancelled_at": "2026-06-27T10:31:00Z"
}
```

**Response** (409):
```json
{
  "error": "Cannot cancel",
  "detail": "Job render_4a5b6c is already in state 'completed'"
}
```

---

## AI Agents Service (Port 8002)

Node.js (Bun) service for Chronos Copilot LLM orchestration and CRDT WebSocket sync. Base URL: `http://localhost:8002`

### POST /orchestrate

Send a natural language editing command to the Chronos Copilot for autonomous timeline manipulation.

**URL**: `POST /orchestrate`

**Request Body** (application/json):
```json
{
  "project_id": "proj_abc123",
  "prompt": "Add a crossfade transition between clip 3 and clip 4, then apply the 'cinematic' LUT to all clips on track 1",
  "context": {
    "timeline_state": {
      "tracks": 3,
      "clips": 12,
      "duration_ms": 45000
    },
    "available_transitions": ["crossfade", "dip_to_black", "wipe", "slide"],
    "available_luts": ["cinematic", "vintage", "teal_orange", "black_and_white"]
  },
  "max_operations": 10,
  "require_confirmation": false
}
```

**Response** (200):
```json
{
  "status": "executed",
  "plan": [
    {
      "operation": "add_transition",
      "params": {
        "type": "crossfade",
        "between_clips": [3, 4],
        "duration_ms": 500
      }
    },
    {
      "operation": "apply_lut",
      "params": {
        "lut": "cinematic",
        "target_track": 1,
        "intensity": 1.0
      }
    }
  ],
  "operations_applied": 2,
  "timeline_state_updated": {
    "clips_modified": 12,
    "transitions_added": 1
  },
  "tokens_used": 342
}
```

**Response** (200) — with require_confirmation: true:
```json
{
  "status": "plan_generated",
  "plan": [
    {
      "operation": "add_transition",
      "params": {
        "type": "crossfade",
        "between_clips": [3, 4],
        "duration_ms": 500
      }
    }
  ],
  "confirm_required": true,
  "confirmation_id": "confirm_9f1e2d"
}
```

**Response** (422):
```json
{
  "error": "Unresolvable prompt",
  "detail": "Could not identify clip 99 in the current timeline (max clip index: 12)"
}
```

---

### POST /orchestrate/confirm

Confirm and execute a previously generated plan.

**URL**: `POST /orchestrate/confirm`

**Request Body** (application/json):
```json
{
  "confirmation_id": "confirm_9f1e2d"
}
```

**Response** (200):
```json
{
  "status": "executed",
  "confirmation_id": "confirm_9f1e2d",
  "operations_applied": 1
}
```

---

### GET /health

Health check endpoint available on all services.

**URL**: `GET /health`

**Response** (200):
```json
{
  "status": "healthy",
  "service": "ai-agents",
  "version": "1.2.0",
  "uptime_seconds": 86400
}
```

---

## Common Error Responses

All services return errors in a consistent format.

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "detail": "Missing or invalid Authorization header"
}
```

### 429 Rate Limited
```json
{
  "error": "Too many requests",
  "detail": "Rate limit exceeded. Retry after 30 seconds.",
  "retry_after_seconds": 30
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "detail": "An unexpected error occurred. The incident has been logged.",
  "incident_id": "inc_abc123"
}
```

### 503 Service Unavailable
```json
{
  "error": "Service unavailable",
  "detail": "GPU workers are currently at capacity. Job queued for processing.",
  "queue_position": 5
}
```
