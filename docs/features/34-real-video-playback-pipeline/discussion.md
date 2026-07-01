# 💬 Discussion: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Status**: 🟡 IN PROGRESS
> **Branch**: `feature/34-real-video-playback-pipeline`
> **Depends On**: #33, #22, #19
> **Date Started**: 2026-07-01
> **Date Completed**: —

---

## Summary

Make Lazynext actually play and render real video files. Today the GPU compositor renders test patterns. Real video files are not decoded, uploaded as textures, or rendered through the compositor pipeline. This feature wires the existing ffmpeg_loader and ring_buffer_decoder to feed real decoded frames into the GPU compositor, producing actual video output instead of test patterns.

---

## Lessons from Previous Features

- **From #18 (AI-Driven Editing)**: Always audit the actual code before scoping. The compositor, ffmpeg_loader, and ring_buffer_decoder all exist — the gap is wiring, not building new components.
- **From #22 (Real Export Pipeline)**: The compositor renders frames correctly; the issue is what frames go IN (test patterns vs real video). Follow the same verify-then-wire pattern.
- **From #33 (Production Hardening)**: GPUI closure semantics are tricky — test on real hardware, don't assume patterns work across platforms.

---

## Current State

The GPU compositor (`rust/crates/compositor/src/compositor.rs`, 1084 lines) is fully built with:
- 17 blend modes
- 11 effect shaders
- JFA signed distance field masking
- ACES color pipeline
- 3D LUT support
- Stereoscopic output

The infrastructure to DECODE video exists:
- `rust/core/src/ffmpeg_loader.rs` — Native FFmpeg decoder
- `rust/core/src/ring_buffer_decoder.rs` — Threaded ring buffer for real-time playback
- `rust/core/src/frame_cache.rs` — LRU cache for decoded frames

**The gap**: These components are written but not connected. The compositor receives `test_pattern.png` as texture input. Real video files are never decoded and uploaded.

---

## Functional Requirements

- [ ] CLI `render` command reads real video files (not test_pattern.png) via ffmpeg_loader
- [ ] GPU compositor receives real decoded frames as textures
- [ ] Web app WASM bridge can decode video frames in browser (WebCodecs fallback)
- [ ] Desktop app preview shows real video playback (not "No Frame Rendered")
- [ ] Export pipeline produces video with actual content (ffprobe verifies non-solid-color output)
- [ ] Verify with a real 30-second MP4 file: ingest → preview frame → export → ffprobe validation

---

## Proposed Approach

**Wire existing components — don't build new ones.** The compositor, ffmpeg_loader, ring_buffer_decoder, and frame_cache all exist and compile. The work is:

1. **CLI path**: Modify `cmd_render` to load real media from `media_pool`, decode frames via `ffmpeg_loader`, and upload to compositor textures
2. **Web path**: Use WebCodecs API in the browser to decode video → canvas → WASM texture upload
3. **Desktop path**: Connect `ffmpeg_loader` → `ring_buffer_decoder` → `CoreEngine::render_frame()`

The `AssetLoader` trait already defines the contract. `FrameCacheLoader` already wraps it with LRU caching. The pipeline exists — just feed it real data.

---

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Feature #22 — Real Export Pipeline | Feature | ✅ Complete |
| Feature #19 — GPU Rendering & WASM | Feature | ✅ Complete |
| Feature #33 — Production Hardening | Feature | ✅ Complete |
| rust/core/src/ffmpeg_loader.rs | Code | ✅ Exists, needs wiring |
| rust/core/src/ring_buffer_decoder.rs | Code | ✅ Exists, needs wiring |
| rust/crates/compositor | Crate | ✅ Complete |

---

## Open Questions

- [ ] Does ffmpeg_loader support H.265/HEVC decoding on macOS? (check codec support)
- [ ] What's the frame upload latency from ffmpeg → GPU texture for 4K video?
- [ ] Can the ring_buffer_decoder keep up with 60fps playback?

---

## Decisions Made

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-01 | Wire existing components, don't build new ones | ffmpeg_loader, ring_buffer_decoder, frame_cache all exist |
| 2026-07-01 | Prioritize CLI path first | Simplest path — no GUI, no WASM, direct Rust→Rust connection |

## Discussion Complete ✅

**Summary**: The compositor renders test patterns. Real video decode infrastructure exists but isn't connected. Wire ffmpeg_loader → ring_buffer_decoder → compositor textures to produce real video output. CLI path first (simplest), then Desktop, then Web.

**Completed**: 2026-07-01
**Next**: Create architecture doc → `architecture.md`
