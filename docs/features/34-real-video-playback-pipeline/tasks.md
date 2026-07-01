# ✅ Tasks: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/34-real-video-playback-pipeline`
> **Status**: 🔴 NOT STARTED
> **Progress**: 0/20 tasks complete

---

## Pre-Flight

- [ ] Discussion doc marked COMPLETE
- [ ] Architecture doc FINALIZED
- [ ] Feature branch created from main
- [ ] Dependencies merged to main

---

## Phase A — CLI Real Video Render

- [x] **A.1** — Verify ffmpeg_loader can decode real H.264 video
  - Create test: feed a known MP4 → verify get_frame() returns non-empty RGBA
- [x] **A.2** — Modify CLI cmd_render to load from media_pool
  - Read project_data.media_pool entries
  - For each clip, resolve its media_id to a file path
- [x] **A.3** — Wire ffmpeg_loader decode into CoreEngine texture
  - Call ffmpeg_loader::decode_frame(path, idx) for each frame
  - Upload decoded data as wgpu texture
  - Pass texture to compositor::render_frame_to_texture()
- [x] **A.4** — Verify output with ffprobe
  - Render a 3-second test video
  - ffprobe: verify non-solid-color, correct duration, valid codec
- [ ] 📍 **Checkpoint A** — CLI produces real video from real input

---

## Phase B — Desktop Real Preview

- [x] **B.1** — Start ring_buffer_decoder on file import
  - On +Import button click, spawn decoder thread
  - Fill ring buffer with decoded frames
- [x] **B.2** — Feed decoded frames to compositor
  - In EditorShell render loop, call engine.load_video_texture()
  - Pass texture to compositor::render_frame()
- [x] **B.3** — Display real preview in GPUI
  - Replace "No Frame Rendered" with actual video frame
  - Verify frame counter updates during playback
- [ ] 📍 **Checkpoint B** — Desktop shows real video preview

---

## Phase C — Web Video Decode

- [x] **C.1** — Add WebCodecs video decoder
  - Create VideoDecoder with H.264 config
  - Decode uploaded .mp4 file in browser
  - Draw decoded frame to canvas
- [x] **C.2** — Upload decoded frame to WASM compositor
  - Transfer canvas pixels to WASM memory
  - Create GPU texture from pixel data
- [x] **C.3** — Render via WASM compositor
  - Call wasm compositor with uploaded texture
  - Display on canvas
- [ ] 📍 **Checkpoint C** — Web app renders real video in browser

---

## Phase D — Full Pipeline Verification

- [x] **D.1** — Create 30-second test video (ffmpeg generated)
- [x] **D.2** — CLI: ingest → render → ffprobe verify
- [x] **D.3** — Desktop: import → preview → export
- [x] **D.4** — Web: upload → preview → export
- [ ] 📍 **Checkpoint D** — All 3 formats produce real video output

---

## Phase E — Testing

- [ ] **E.1** — Add Rust integration test: decode + texture upload
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
