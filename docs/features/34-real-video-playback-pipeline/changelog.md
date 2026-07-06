# Changelog: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Branch**: `feature/34-real-video-playback-pipeline`

## Session Note — 2026-07-07 (Agent: opencode)

**Context**: Verified existing CLI video decode pipeline and added integration tests.

### Completed

- **Pre-Flight** — Feature branch exists, architecture doc is FINALIZED.
- **A.1** — Verified `CliFfmpegLoader` can decode real H.264 video. Added integration test `rust/core/tests/video_decode.rs` (2 tests: decode real frame + error on nonexistent file). Both pass.
- **A.2** — Confirmed CLI `cmd_render` already loads from media_pool: `clip.media_id` → `pd.media_pool.get(mid)` → `asset.path_or_url` (engine.rs L232-236, cli/main.rs L346-385).
- **A.3** — Confirmed ffmpeg_loader → CoreEngine texture pipeline: `CliFfmpegLoader::load_frame()` → `CoreEngine::upload_texture()` → compositor `render_frame_to_texture()` → `dispatch_export()`.
- **E.1** — Added Rust integration test for decode + texture upload pipeline (2 tests passing).

### Remaining

- **A.4** — ffprobe verification of rendered output
- **B (Desktop)** — GPUI real preview integration (ring buffer decoder, compositor feed, live preview)
- **C (Web)** — WebCodecs video decoder + WASM compositor upload
- **D** — Full pipeline verification across all 3 formats
- **E.2** — Web E2E test
