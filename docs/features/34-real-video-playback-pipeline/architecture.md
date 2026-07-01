# 🏗️ Architecture: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟡 DRAFT
> **Date**: 2026-07-01

---

## Overview

Connect the existing ffmpeg_loader → ring_buffer_decoder → FrameCacheLoader → compositor texture pipeline. No new components — the work is wiring and integration.

---

## File Structure

```
# CLI — Feed real video into render pipeline
rust/cli/src/main.rs                      # MODIFY: Load media from media_pool, not test_pattern.png

# Core — Wire video decode path
rust/core/src/engine.rs                   # MODIFY: Add load_video_texture() method
rust/core/src/ffmpeg_loader.rs            # VERIFY: Confirm decode_frame() works for H.264
rust/core/src/ring_buffer_decoder.rs      # VERIFY: Confirm ring buffer delivers frames
rust/core/src/frame_cache.rs              # VERIFY: LRU cache serves decoded frames

# Desktop — Connect playback to real decode
apps/desktop/src/editor.rs                # MODIFY: Use ffmpeg_loader for preview frames

# Web — Browser-side video decode
apps/web/src/lib/wasm-bridge.ts           # MODIFY: Add WebCodecs video decode path
rust/wasm/src/compositor.rs               # VERIFY: Texture upload from JS works
```

---

## Data Flow

```
CLI Render Path:
  media_pool → ffmpeg_loader::decode_frame(frame_idx)
    → FrameCacheLoader (LRU cache)
      → CoreEngine::render_frame() → compositor GPU texture
        → export pipeline → ffmpeg encode → output.mp4

Desktop Preview Path:
  Import .mp4 → ffmpeg_loader → ring_buffer_decoder (background thread)
    → FrameCacheLoader → CoreEngine::render_frame(current_frame)
      → GPUI Image display

Web Path:
  <input type=file> → WebCodecs VideoDecoder → canvas → WebGL texture
    → WASM compositor → canvas display
```

---

## Key Changes

### 1. CLI — Real media source (rust/cli/src/main.rs)
- In `cmd_render`, iterate `project_data.media_pool` to find video files
- Call `ffmpeg_loader::decode_frame(path, frame_idx)` for each frame
- Upload decoded RGBA data as compositor texture
- Fall back to test_pattern.png if no media found

### 2. CoreEngine — Texture loader (rust/core/src/engine.rs)
- Add `pub async fn load_video_texture(&self, media_id: &str, frame_idx: u32) -> Result<wgpu::Texture, String>`
- Uses ffmpeg_loader → ring_buffer → GPU texture upload
- Caches textures in compositor's TextureStore

### 3. Desktop — Real preview (apps/desktop/src/editor.rs)  
- On file import, start ring_buffer_decoder thread
- In render loop, fetch decoded frames instead of render_frame(0)
- Display real video frames in GPUI Image

---

## Configuration

| Key | Value | Description |
|---|---|---|
| `FFMPEG_PATH` | `ffmpeg` | Path to ffmpeg binary |
| `SKIP_MEDIA_DECODE` | `false` | Skip real decode, use test patterns |

---

## Next

Create tasks doc → `tasks.md`
