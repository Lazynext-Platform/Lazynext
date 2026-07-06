# ✅ Tasks: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/34-real-video-playback-pipeline`
> **Status**: 🟡 IN PROGRESS
> **Progress**: 14/20 tasks complete

---

## Pre-Flight

- [x] Discussion doc marked COMPLETE
- [x] Architecture doc FINALIZED
- [x] Feature branch created from main
- [x] Dependencies merged to main

---

## Phase A — CLI Real Video Render

- [x] **A.1** — Verify ffmpeg_loader can decode real H.264 video
  - Integration test: `rust/core/tests/video_decode.rs` (2 tests passing).
  - `CliFfmpegLoader` decodes frames via ffmpeg CLI → raw RGBA.
- [x] **A.2** — Modify CLI cmd_render to load from media_pool
  - CLI L346-385: loads from media_uploads, feeds to `load_frame()` + `upload_texture()`.
  - Engine L232-236: resolves `clip.media_id` → `pd.media_pool` → `asset.path_or_url`.
- [x] **A.3** — Wire ffmpeg_loader decode into CoreEngine texture
  - `CliFfmpegLoader::load_frame()` → `CoreEngine::upload_texture()` → compositor → `dispatch_export()`.
- [x] **A.4** — Verify output with ffprobe
  - Previously verified (2026-07-01: red.mp4 → red pixel output confirmed).
- [x] 📍 **Checkpoint A** — CLI produces real video from real input

---

## Phase B — Desktop Real Preview

- [ ] **B.1** — Start ring_buffer_decoder on file import
  - On +Import button click, spawn decoder thread. Fill ring buffer with decoded frames.
- [x] **B.2** — Feed decoded frames to compositor
  - Already implemented: `EditorShell::render()` calls `engine.render_frame(self.current_frame)` (editor.rs L39). CoreEngine renders via compositor.
- [x] **B.3** — Display real preview in GPUI
  - Already implemented: GPUI preview (editor.rs L114-148) renders `last_frame_data` as `gpui::RenderImage` from decoded RGBA frames.
- [ ] 📍 **Checkpoint B** — Desktop shows real video preview

---

## Phase C — Web Video Decode

- [x] **C.1** — Add WebCodecs video decoder
  - `media/video-decoder.ts`: `VideoFrameDecoder` class (sync/async per-frame decode).
  - `wasm-player.tsx` L233-312: existing `<video>` element + OffscreenCanvas pipeline for video frame extraction.
- [x] **C.2** — Upload decoded frame to WASM compositor
  - `wasm-player.tsx` L315-319: `uploadTexture({ id, source, width, height })` uploads offscreen canvas data to WASM textures cache.
- [x] **C.3** — Render via WASM compositor
  - `wasm-player.tsx` L426: `renderProjectFrame(projectJson, frame)` — WASM Rust compositor renders all textures to `<canvas id="lazynext-canvas">`.
- [x] 📍 **Checkpoint C** — Web app renders real video in browser

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
  - `rust/core/tests/video_decode.rs`: 2 tests passing (real frame decode + error handling).
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
