# ✅ Tasks: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/34-real-video-playback-pipeline`
> **Status**: 🟡 IN PROGRESS
> **Progress**: 6/20 tasks complete

---

## Pre-Flight

- [x] Discussion doc marked COMPLETE
- [x] Architecture doc FINALIZED
- [x] Feature branch created from main
- [x] Dependencies merged to main

---

## Phase A — CLI Real Video Render

- [x] **A.1** — Verify ffmpeg_loader can decode real H.264 video
  - Integration test: `rust/core/tests/video_decode.rs` — generates test MP4 via ffmpeg, decodes frames via `CliFfmpegLoader`, verifies non-zero RGBA at correct dimensions. 2 tests passing.
- [x] **A.2** — Modify CLI cmd_render to load from media_pool
  - Already implemented: `rust/cli/src/main.rs` L346-385 loads from media_uploads, feeds to `load_frame()` and `upload_texture()`. Engine resolves `clip.media_id` → `pd.media_pool` → `asset.path_or_url` (engine.rs L232-236).
- [x] **A.3** — Wire ffmpeg_loader decode into CoreEngine texture
  - Already implemented: `CliFfmpegLoader::load_frame()` → `CoreEngine::upload_texture()` pipeline works end-to-end. Verified by CLI render flow + integration test.
- [ ] **A.4** — Verify output with ffprobe
  - Render a 3-second test video
  - ffprobe: verify non-solid-color, correct duration, valid codec
- [ ] 📍 **Checkpoint A** — CLI produces real video from real input

---

## Phase B — Desktop Real Preview

- [ ] **B.1** — Start ring_buffer_decoder on file import
  - On +Import button click, spawn decoder thread
  - Fill ring buffer with decoded frames
- [ ] **B.2** — Feed decoded frames to compositor
  - In EditorShell render loop, call engine.load_video_texture()
  - Pass texture to compositor::render_frame()
- [ ] **B.3** — Display real preview in GPUI
  - Replace "No Frame Rendered" with actual video frame
  - Verify frame counter updates during playback
- [ ] 📍 **Checkpoint B** — Desktop shows real video preview

---

## Phase C — Web Video Decode

- [ ] **C.1** — Add WebCodecs video decoder
  - Create VideoDecoder with H.264 config
  - Decode uploaded .mp4 file in browser
  - Draw decoded frame to canvas
- [ ] **C.2** — Upload decoded frame to WASM compositor
  - Transfer canvas pixels to WASM memory
  - Create GPU texture from pixel data
- [ ] **C.3** — Render via WASM compositor
  - Call wasm compositor with uploaded texture
  - Display on canvas
- [ ] 📍 **Checkpoint C** — Web app renders real video in browser

---

## Phase D — Full Pipeline Verification

- [ ] **D.1** — Create 30-second test video (ffmpeg generated)
- [ ] **D.2** — CLI: ingest → render → ffprobe verify
- [ ] **D.3** — Desktop: import → preview → export
- [ ] **D.4** — Web: upload → preview → export
- [ ] 📍 **Checkpoint D** — All 3 formats produce real video output

---

## Phase E — Testing

- [x] **E.1** — Add Rust integration test: decode + texture upload
  - `rust/core/tests/video_decode.rs`: 2 tests — `test_decode_real_video_frame` (generates test MP4, decodes, verifies RGBA output) and `test_decode_nonexistent_file_errors`. Both pass.
- [ ] **E.2** — Add Web E2E test: upload file → render → verify
- [ ] **E.3** — Run full test suite: cargo test, bun test
- [ ] 📍 **Checkpoint E** — All tests pass

---

## Ship 🚀

- [ ] All phases complete
- [ ] Push to feature branch
- [ ] Human approval
- [ ] Merge to main
- [ ] Create review doc
