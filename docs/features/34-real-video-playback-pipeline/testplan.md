# 🧪 Test Plan: Real Video Playback Pipeline (Feature #34)

> **Feature**: `34` — Real Video Playback Pipeline

## Scope

Verify real video decode and playback across all 7 formats: CLI, Desktop, Web, Mobile, Extension, Gateway, MCP. Core verification: decode real video → GPU compositor → valid output.

## Test Cases

| ID | Area | Case | Expected | Status |
|---|---|---|---|---|
| TC1 | CLI ffmpeg_loader | Feed known MP4 → `get_frame()` | Returns non-empty RGBA pixel data | ✅ |
| TC2 | CLI render | Load from media_pool, resolve media_id → file path | Clips linked to media assets | ✅ |
| TC3 | CLI compositor | Decode frame → upload as wgpu texture → `compositor::render_frame_to_texture()` | Non-solid-color RGBA output | ✅ |
| TC4 | CLI output | ffprobe on rendered output | Valid codec, correct duration, not solid color | ✅ |
| TC5 | Desktop import | +Import button → spawn ring_buffer_decoder thread | Ring buffer fills with decoded frames | ✅ |
| TC6 | Desktop preview | Playback loop → `engine.load_video_texture()` → compositor render | Real video frame displayed, frame counter updates | ✅ |
| TC7 | Web decode | WebCodecs VideoDecoder with H.264 config | Decoded frame drawn to canvas | ✅ |
| TC8 | Web WASM | Transfer canvas → WASM memory → GPU texture | WASM compositor renders uploaded texture | ✅ |
| TC9 | Full pipeline | 30s test video: ingest → render → ffprobe | All 3 formats produce real video output | ✅ |
| TC10 | Regression | Existing export tests still pass | `cargo test --workspace` green | ✅ |
