# 🧭 Motto: Real Export Pipeline

> **Feature**: `22` — Real Export Pipeline (Compositor Frames → ffmpeg)
> **Branch**: `feature/22-real-export-pipeline`
> **Last Updated**: 2026-06-30

---

## North Star

Every export path — web, CLI, desktop — produces video frames from the same GPU compositor that renders the live preview, so the exported video matches what the user sees (WYSIWYG).

---

## DO ✅

- Route all export frames through `CoreEngine::render_frame()` (native) or `WasmCompositor.renderFrame()` (web) — the same renderer as preview
- Pass `total_frames` from the caller to `ExportPipeline::export()` — never default to `framerate * 10`
- Pass `format` and `bitrate_kbps` from the caller to `dispatch_export()` — never hardcode `Mp4`/`8000`
- Mirror the Rust `encoder.rs` codec/format matrix in render-service's TypeScript to keep native and web paths consistent
- Keep the existing MediaRecorder→webm path as an automatic fallback when render-service is unreachable (graceful degradation, no mocks)
- Validate frame size (`width * height * 4` bytes) at every ingest boundary — reject oversized frames (DoS prevention)
- Use C2PA embedded manifest when `C2PA_SIGNING_CERT_*` env vars are present; fall back to sidecar JSON in dev

---

## DON'T ❌

- Do NOT rebuild the timeline inside an ffmpeg `overlay` filtergraph — it cannot express rotation, effects, masks, blend modes, or animated properties
- Do NOT ship the synthetic test-pattern fallback as the default export for real timelines — it's a degraded path only
- Do NOT change the Rust compositor or its render pipeline — it already works; export consumes existing frames
- Do NOT add new export formats, effects, or blend modes (out of scope — existing set is sufficient)
- Do NOT implement server-side headless compositor (Option B) — that's a future feature; web export uses browser-compositor frames
- Do NOT log C2PA signing keys or raw frame data
- Do NOT change the `project-context.md` export section without human approval (per Mastery autonomy table)

---

## Boundaries 🚧

- Only modify files listed in `architecture.md` Components to Change table (A1–A8)
- No new dependencies beyond what's in `tasks.md` (WebCodecs, c2pa-node, mp4-muxer all deferred per decisions)
- Render-service legacy `overlay`/`amix` path is preserved as-is — frame-stream path is additive, not a rewrite
- Audio muxing for the frame-stream path is a follow-up; currently video-only (legacy path retains amix)
- Do not refactor BullMQ/Redis or SSE infrastructure — it's working and production-grade

---

## Success Looks Like 🎯

- `cargo test -p lazynext-export` passes with real ffmpeg integration test (TC1, TC2, TC15)
- `bun test tests/frame-export.test.ts` passes (11/11 unit tests for ordering, backpressure, codec matrix)
- Render-service produces a valid, playable MP4 from ingested compositor frames
- Native CLI `--format prores --bitrate 12000` produces a ProRes file, not MP4/8000
- PLATFORM_ASSESSMENT.md 1.6 + M7 marked resolved (no longer claims "delegates entirely to WASM" or "solid-color canvases")
- `cargo fmt --all --check`, `cargo clippy -D warnings`, `bun run typecheck`, render-service `tsc --noEmit` all green
