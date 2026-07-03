# Lazynext API Reference

Complete reference for the API Gateway (port 8005) and all backend microservices.
All services communicate over the `lazynext-network` Docker bridge.

---

## Authentication

All authenticated endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Obtaining a Token

**URL**: `POST /api/v1/auth/sign-in`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "Jane Editor"
  },
  "expires_at": "2026-07-03T10:30:00Z"
}
```

**URL**: `POST /api/v1/auth/sign-up`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "your_password",
  "name": "Jane Editor"
}
```

### API Keys (MCP / Service-to-Service)

Set the `LAZYNEXT_MCP_API_KEY` environment variable. MCP clients pass it as `_api_key` in the JSON-RPC params. Service-to-service calls use the `X-API-Key` header:

```
X-API-Key: lz_sk_abc123def456
```

### RBAC Roles

| Role | Permissions |
|------|-------------|
| `Viewer` | Read-only access to projects and timeline |
| `Editor` | Create/edit/delete clips, tracks, effects; invoke AI tools |
| `Admin` | Full access including project deletion, user management, billing |

---

## Rate Limiting

All API endpoints are rate-limited via Upstash Redis (or in-memory fallback for dev).

| Tier | Requests | Window |
|------|----------|--------|
| Free | 100 | 1 minute |
| Pro | 1,000 | 1 minute |
| Studio | 10,000 | 1 minute |

Rate limit headers on every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1625230000
Retry-After: 30
```

**429 Response**:
```json
{
  "error": "Too many requests",
  "detail": "Rate limit exceeded. Retry after 30 seconds.",
  "retry_after_seconds": 30
}
```

---

## General Endpoints

### `GET /health`

Health check for the API Gateway and all downstream dependencies.

**Response** (200):
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "render_service": "ok"
  }
}
```

### `GET /swagger-ui`

OpenAPI Swagger UI with interactive API documentation and request builder.

### `GET /api-docs/openapi.json`

Machine-readable OpenAPI 3.0 specification.

---

## Projects

### `GET /api/v1/projects`

List all projects for the authenticated user.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 20 | Items per page (max 100) |
| `offset` | integer | 0 | Pagination offset |
| `sort` | string | `updated_at` | Sort field: `name`, `created_at`, `updated_at` |
| `order` | string | `desc` | Sort order: `asc`, `desc` |

**Response** (200):
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "Summer Recap 2026",
      "width": 1920,
      "height": 1080,
      "framerate": 24,
      "duration_ms": 45000,
      "track_count": 4,
      "clip_count": 12,
      "created_at": "2026-06-15T10:30:00Z",
      "updated_at": "2026-07-02T14:22:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `POST /api/v1/projects`

Create a new project.

**Request**:
```json
{
  "name": "My New Project",
  "width": 1920,
  "height": 1080,
  "framerate": 24,
  "sample_rate": 48000
}
```

**Response** (201):
```json
{
  "id": "proj_def456",
  "name": "My New Project",
  "width": 1920,
  "height": 1080,
  "framerate": 24,
  "created_at": "2026-07-02T14:30:00Z"
}
```

### `GET /api/v1/projects/:id`

Get a single project with full timeline state.

**Response** (200):
```json
{
  "id": "proj_abc123",
  "name": "Summer Recap 2026",
  "width": 1920,
  "height": 1080,
  "framerate": 24,
  "tracks": [
    {
      "id": "track_v1",
      "kind": "video",
      "muted": false,
      "locked": false,
      "clips": [
        {
          "id": "clip_001",
          "name": "drone_shot.mp4",
          "type": "video",
          "start_frame": 0,
          "end_frame": 240,
          "source_url": "s3://bucket/drone_shot.mp4",
          "effects": []
        }
      ]
    },
    {
      "id": "track_a1",
      "kind": "audio",
      "muted": false,
      "locked": false,
      "clips": [
        {
          "id": "clip_audio_001",
          "name": "background_music.wav",
          "type": "audio",
          "start_frame": 0,
          "end_frame": 480,
          "source_url": "s3://bucket/music.wav",
          "volume": 0.75
        }
      ]
    }
  ],
  "created_at": "2026-06-15T10:30:00Z",
  "updated_at": "2026-07-02T14:22:00Z"
}
```

### `PUT /api/v1/projects/:id`

Update project metadata.

**Request**:
```json
{
  "name": "Summer Recap 2026 — Final Cut",
  "framerate": 30
}
```

**Response** (200):
```json
{
  "id": "proj_abc123",
  "name": "Summer Recap 2026 — Final Cut",
  "framerate": 30,
  "updated_at": "2026-07-02T14:35:00Z"
}
```

### `DELETE /api/v1/projects/:id`

Delete a project and all associated media (Admin role required).

**Response** (204): No body.

---

## AI Copilot (Lazynext AI Agent)

### `POST /api/v1/autonomous_edit`

Send a natural language editing command to the Lazynext AI Agent AI Copilot.

**Request**:
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

**Response** (200) — executed:
```json
{
  "status": "executed",
  "plan": [
    {
      "operation": "add_transition",
      "params": {
        "type": "crossfade",
        "between_clips": [3, 4],
        "duration_frames": 12
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

**Response** (200) — with `require_confirmation: true`:
```json
{
  "status": "plan_generated",
  "plan": [
    {
      "operation": "add_transition",
      "params": {
        "type": "crossfade",
        "between_clips": [3, 4],
        "duration_frames": 12
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

### `POST /api/v1/autonomous_edit/confirm`

Confirm and execute a previously generated plan.

**Request**:
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

### `POST /api/v1/ai/generate`

Generate media content via AI (video, image, audio).

**Request**:
```json
{
  "type": "video",
  "prompt": "A cinematic drone shot over a misty forest at sunrise",
  "duration_frames": 24,
  "fps": 24,
  "width": 1024,
  "height": 576,
  "seed": 42
}
```

**Response** (200):
```json
{
  "status": "completed",
  "output_url": "s3://generated/video_8a9b0c.mp4",
  "generation_time_seconds": 18.3,
  "model": "stable-video-diffusion-img2vid-xt"
}
```

### `POST /api/v1/ai/tts`

Text-to-speech using ElevenLabs.

**Request**:
```json
{
  "text": "Hello and welcome to this tutorial.",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "language": "en"
}
```

**Response** (200):
```json
{
  "status": "completed",
  "audio_url": "s3://tts/audio_1f2e3d.mp3",
  "duration_seconds": 3.4
}
```

---

## Media & Assets

### `POST /api/v1/media/upload`

Upload media file via multipart form data.

**Request**: `multipart/form-data`
- `file`: binary file (max 2 GB)
- `project_id`: string

**Response** (201):
```json
{
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

### `GET /api/v1/media/assets`

List all assets for a project.

**Query**: `?project_id=proj_abc123&limit=50&offset=0`

**Response** (200):
```json
{
  "assets": [
    {
      "id": "asset_d4e5f6",
      "filename": "drone_shot.mp4",
      "type": "video",
      "duration_ms": 45000,
      "file_size_bytes": 524288000,
      "created_at": "2026-07-01T08:00:00Z"
    }
  ],
  "total": 5
}
```

### `GET /api/v1/media/asset/:id`

Get asset metadata and download URL.

**Response** (200):
```json
{
  "id": "asset_d4e5f6",
  "filename": "drone_shot.mp4",
  "download_url": "https://...sas-token...",
  "expires_in_seconds": 3600
}
```

### `DELETE /api/v1/media/asset/:id`

Delete an asset (Admin role required).

**Response** (204): No body.

---

## Pre-Processing Service (Port 8000)

Python FastAPI. Base URL: `http://localhost:8000`

### `POST /transcribe`

Transcribe audio using OpenAI Whisper.

**Request** (multipart/form-data):
```
file: <binary>
model: large-v3
language: en
word_timestamps: true
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

### `POST /process`

Run full pre-processing: scene detection, silence detection, clip tagging.

**Request**:
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
  "estimated_duration_seconds": 45
}
```

### `POST /rotoscope`

SAM2 rotoscoping — extract masks from video.

**Request**:
```json
{
  "source_url": "s3://bucket/input.mp4",
  "points": [{"x": 320, "y": 240, "label": 1}],
  "frame_index": 0,
  "propagate": true,
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

### `POST /ingest`

Ingest media from URL or upload. Handles format normalization and proxy generation.

**Request**:
```json
{
  "source_url": "https://example.com/video.mp4",
  "project_id": "proj_abc123",
  "generate_proxies": true,
  "proxy_resolution": "1080p"
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
    "fps": 29.97
  },
  "proxies": {
    "1080p": "s3://bucket/proxies/asset_d4e5f6_1080p.mp4"
  }
}
```

### `POST /track`

Track an object across video frames.

**Request**:
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
    {"frame": 0, "bbox": {"x": 100, "y": 150, "width": 200, "height": 200}, "confidence": 0.99}
  ],
  "tracked_frames": 300,
  "average_confidence": 0.94
}
```

---

## Generative Studio Service (Port 8001)

Python FastAPI. Base URL: `http://localhost:8001`

### `POST /generate-video`

Generate video from text/image/video using Stable Video Diffusion.

**Request**:
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

### `POST /dub`

Dub audio via ElevenLabs with optional lip-sync.

**Request**:
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
  "language": "es"
}
```

### `POST /split-stems`

Split audio into stems using Demucs.

**Request**:
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
  "processing_time_seconds": 12.7
}
```

### `POST /upscale`

Upscale video using Real-ESRGAN.

**Request**:
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

### `POST /style-transfer`

Apply artistic style transfer.

**Request**:
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
  "processing_time_seconds": 120.5
}
```

---

## Render Service (Port 8003)

Node.js (Bun) render farm. Base URL: `http://localhost:8003`

### `POST /jobs`

Submit a render job. Returns job ID immediately; progress via SSE.

**Request**:
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
  "created_at": "2026-07-02T10:30:00Z"
}
```

**Supported formats**:

| Format | Extension | Codecs | Typical Use |
|--------|-----------|--------|-------------|
| MP4 | `.mp4` | h264, h265, vp9 | Web, YouTube, social |
| MOV | `.mov` | prores, h264 | Professional editing |
| ProRes | `.mov` | prores_422, prores_4444 | Broadcast, color grading |
| DCP | `.mxf` | jpeg2000 | Digital Cinema |
| AAF | `.aaf` | — | Avid/Pro Tools interchange |
| GIF | `.gif` | — | Short loops, memes |

### `POST /export`

Submit an export using a delivery preset.

**Request**:
```json
{
  "project_id": "proj_abc123",
  "preset": "youtube_4k",
  "watermark": false,
  "burn_subtitles": true
}
```

**Available presets**:
- `youtube_4k` — 3840x2160, h264, 45 Mbps
- `youtube_1080p` — 1920x1080, h264, 16 Mbps
- `instagram_reel` — 1080x1920, h264, 8 Mbps
- `tiktok` — 1080x1920, h264, 8 Mbps
- `broadcast_prores` — ProRes 422 HQ, 1920x1080
- `dcp_2k` — 2048x1080, JPEG2000, 250 Mbps
- `aaf_avid` — AAF interchange for Avid

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

### `GET /stream/:job_id`

Stream render progress via Server-Sent Events.

**Response** (text/event-stream):
```
event: progress
data: {"job_id":"render_4a5b6c","status":"rendering","percent":42.5,"frame":102,"total_frames":240,"eta_seconds":18}

event: progress
data: {"job_id":"render_4a5b6c","status":"rendering","percent":67.0,"frame":161,"total_frames":240,"eta_seconds":10}

event: complete
data: {"job_id":"render_4a5b6c","status":"completed","output_url":"s3://renders/proj_abc123/render_4a5b6c.mp4","file_size_bytes":524288000,"duration_ms":30000,"render_time_seconds":32.1}
```

### `GET /jobs/:job_id`

Get current status of a render job.

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
  "created_at": "2026-07-02T10:30:00Z",
  "completed_at": "2026-07-02T10:30:32Z"
}
```

### `DELETE /jobs/:job_id`

Cancel a queued or in-progress job.

**Response** (200):
```json
{
  "job_id": "render_4a5b6c",
  "status": "cancelled",
  "cancelled_at": "2026-07-02T10:31:00Z"
}
```

**Response** (409):
```json
{
  "error": "Cannot cancel",
  "detail": "Job is already in state 'completed'"
}
```

---

## AI Agents Service (Port 8002)

Node.js (Bun) Lazynext AI Agent Copilot. Base URL: `http://localhost:8002`

### `POST /orchestrate`

Send a natural language editing command.

**Request**:
```json
{
  "project_id": "proj_abc123",
  "prompt": "Cut all silence and add background music at 20% volume",
  "context": {
    "timeline_state": {"tracks": 3, "clips": 8, "duration_ms": 30000}
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
      "operation": "cut_silence",
      "params": {"threshold_db": -40, "min_duration_ms": 500}
    },
    {
      "operation": "add_audio_clip",
      "params": {"source_url": "s3://music/bg.mp3", "volume": 0.2}
    }
  ],
  "operations_applied": 2,
  "tokens_used": 156
}
```

### `POST /orchestrate/confirm`

Confirm a generated plan.

**Request**: `{"confirmation_id": "confirm_9f1e2d"}`

**Response** (200):
```json
{"status": "executed", "confirmation_id": "confirm_9f1e2d", "operations_applied": 1}
```

### `GET /health`

**Response** (200):
```json
{"status": "healthy", "service": "ai-agents", "version": "1.0.0", "uptime_seconds": 86400}
```

---

## Collab Server (Port 8004)

Rust (Axum) CRDT sync + WebRTC signaling. Base URL: `http://localhost:8004`

### WebSocket `ws://localhost:8004/ws/:project_id`

Connect to real-time CRDT sync for a project. Sends and receives `CrdtOperation` JSON messages. WebRTC signaling for peer-to-peer audio/video.

**Client → Server** (JSON over WebSocket):
```json
{
  "type": "crdt_operation",
  "operation": {
    "variant": "UpdateClipStart",
    "clip_id": "clip_001",
    "new_start": 48,
    "timestamp": 1625230000000,
    "peer_id": "peer_abc"
  }
}
```

**Server → Clients** (broadcast):
```json
{
  "type": "crdt_sync",
  "operations": [
    {
      "variant": "UpdateClipStart",
      "clip_id": "clip_001",
      "new_start": 48,
      "timestamp": 1625230000000,
      "peer_id": "peer_abc"
    }
  ],
  "vector_clock": {"peer_abc": 42, "peer_def": 15}
}
```

### `GET /health`

**Response** (200):
```json
{"status": "healthy", "service": "collab-server", "active_sessions": 12}
```

---

## Analytics Service (Port 8006)

Node.js (Bun) data ingestion. Base URL: `http://localhost:8006`

### `POST /events`

Ingest an analytics event (batched or single).

**Request**:
```json
{
  "events": [
    {
      "type": "render_started",
      "project_id": "proj_abc123",
      "user_id": "user_xyz",
      "timestamp": "2026-07-02T10:30:00Z",
      "properties": {
        "format": "mp4",
        "duration_ms": 30000,
        "resolution": "1920x1080"
      }
    }
  ]
}
```

**Response** (202): `{"accepted": 1}`

---

## Social Publish Service (Port 8007)

Node.js (Bun). Base URL: `http://localhost:8007`

### `POST /publish`

Publish rendered video to social platforms.

**Request**:
```json
{
  "render_job_id": "render_4a5b6c",
  "platforms": ["youtube", "tiktok"],
  "metadata": {
    "title": "Summer Recap 2026",
    "description": "Best moments from summer 2026!",
    "tags": ["summer", "recap", "2026"],
    "schedule_at": "2026-07-04T12:00:00Z"
  }
}
```

**Response** (200):
```json
{
  "status": "scheduled",
  "platforms": {
    "youtube": {"status": "queued", "estimated_publish": "2026-07-04T12:00:00Z"},
    "tiktok": {"status": "queued", "estimated_publish": "2026-07-04T12:00:00Z"}
  }
}
```

---

## Common Error Codes

| HTTP Status | Meaning | Response Format |
|-------------|---------|-----------------|
| `400` | Bad Request — invalid input | `{"error": "...", "detail": "..."}` |
| `401` | Unauthorized — missing/invalid JWT | `{"error": "Unauthorized", "detail": "..."}` |
| `403` | Forbidden — insufficient role | `{"error": "Forbidden", "detail": "Admin role required"}` |
| `404` | Not Found | `{"error": "Not found", "detail": "..."}` |
| `409` | Conflict — duplicate or state mismatch | `{"error": "...", "detail": "..."}` |
| `413` | Payload Too Large | `{"error": "File too large", "detail": "Maximum 2GB"}` |
| `415` | Unsupported Media Type | `{"error": "...", "detail": "..."}` |
| `422` | Unprocessable Entity | `{"error": "...", "detail": "..."}` |
| `429` | Too Many Requests | `{"error": "Too many requests", "retry_after_seconds": 30}` |
| `500` | Internal Server Error | `{"error": "Internal server error", "incident_id": "inc_abc123"}` |
| `503` | Service Unavailable | `{"error": "Service unavailable", "detail": "..."}` |

All error responses follow the format:
```json
{
  "error": "<short error message>",
  "detail": "<human-readable explanation>",
  "incident_id": "<optional incident tracking ID>"
}
```

---

## WebSocket Endpoints

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `ws://localhost:8004/ws/:project_id` | CRDT JSON | Real-time timeline sync |
| `ws://localhost:8002/ws/:project_id` | CRDT JSON | Lazynext AI Agent AI streaming responses |

---

## Observability

| Service | URL | Description |
|---------|-----|-------------|
| Grafana | `http://localhost:3001` | Dashboards, alerting (admin / admin) |
| Prometheus | `http://localhost:9090` | Metrics and alerting rules |
| Tempo | `http://localhost:3200` | Distributed tracing |
| Loki | `http://localhost:3100` | Log aggregation |
| Swagger UI | `http://localhost:8005/swagger-ui` | Interactive API docs |
| OpenAPI JSON | `http://localhost:8005/api-docs/openapi.json` | Machine-readable spec |
