# 📋 Tasks: Real Export Pipeline (Feature #22)

> **Status**: 🔴 STAGE 3 — Plan (awaiting Stage 4 human Approve before ANY build task runs)
> **Branch**: `feature/22-real-export-pipeline` (create at task P0.0)

## Approval ✅
- **Approved by**: Human (project owner) — "I approved all."
- **Date**: 2026-06-30
- **Decisions confirmed**:
  1. Web export canonical path = browser WASM compositor streams RGBA frames to render-service (WYSIWYG). ✅
  2. C2PA embedded via `c2pa-node` now (adds dependency); keep sidecar JSON as dev fallback. ✅
  3. New endpoints `POST /api/v1/export/:jobId/frames`, `/frames/end`, `DELETE /api/v1/export/:jobId` added to render-service. ✅

---

## P0 — Pre-Build
- [ ] P0.0 Create branch `feature/22-real-export-pipeline` from `main`
- [ ] P0.1 Confirm ffmpeg present in dev + CI image (`ffmpeg -version`)
- [ ] P0.2 Create `changelog.md` (empty, ready for build logging)

## P1 — Rust: fix ExportPipeline + dispatch_export (native path)
- [ ] P1.1 `pipeline.rs`: change `export()` to accept `total_frames: u32`; remove `framerate*10` default; update doc comment
- [ ] P1.2 `engine.rs::dispatch_export`: accept `format: ExportFormat`, `bitrate_kbps: u32`, `total_frames: u32`; thread into `ExportConfig` + `pipeline.export(...)`
- [ ] P1.3 Update existing pipeline/export unit tests to new signature
- [ ] P1.4 `cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings` clean
- [ ] P1.5 `cargo test -p lazynext-export -p lazynext-core` green
- [ ] **Checkpoint C1**: native CLI renders a real file of correct duration (manual smoke)

## P2 — Web: fix export contract + browser frame capture
- [ ] P2.1 `apps/web/src/app/api/export/route.ts`: POST to `/api/v1/export`; send `{projectId, format, bitrate_kbps, width, height, framerate, totalFrames}`
- [ ] P2.2 `EditorClient.tsx::startExport`: compute `totalFrames` from timeline; drive frame loop using `WasmCompositor.renderFrame` → capture RGBA (`getImageData` / WASM readback)
- [ ] P2.3 Implement chunked frame upload to `/api/v1/export/:jobId/frames` with sequence header + backpressure handling (pause on 503)
- [ ] P2.4 POST `/frames/end` on completion; wire SSE status polling to existing `/api/v1/jobs/:jobId/stream`
- [ ] P2.5 Graceful degradation: if render-service offline, fall back to local `WebCodecs`+`mp4-muxer` encode (no mock)
- [ ] P2.6 `bun run typecheck && bun run lint` clean
- [ ] **Checkpoint C2**: web export of a transform-bearing timeline matches the preview

## P3 — render-service: frame-ingest worker + format/cancel/C2PA
- [ ] P3.1 New `POST /api/v1/export/:jobId/frames` (append-only, ordered, size-validated) + `/frames/end`
- [ ] P3.2 Job lifecycle: add `awaiting_frames` state; spawn ffmpeg on first frame (or on `/end` with buffer) using format-aware args (port `build_ffmpeg_args` codec/pix_fmt matrix from `encoder.rs`)
- [ ] P3.3 Keep audio `amix` as secondary input; mux with video stream
- [ ] P3.4 `DELETE /api/v1/export/:jobId` → kill ffmpeg child, discard output
- [ ] P3.5 C2PA: embed via `c2pa-node` when `C2PA_SIGNING_CERT_*` set; else dev sidecar (current behavior)
- [ ] P3.6 Backpressure: 503 + cap `EXPORT_FRAME_STREAM_MAX_BYTES`
- [ ] P3.7 Update `render-service/tests/render.test.ts` for new endpoints
- [ ] **Checkpoint C3**: end-to-end render-service job produces a valid, playable MP4

## P4 — Testing
- [ ] P4.1 Rust integration test (`rust/tests/export_pipeline.rs`): real ffmpeg, N frames, assert ffprobe duration + dimensions
- [ ] P4.2 render-service test: ingest synthetic frames → valid output file
- [ ] P4.3 Web Playwright test: trigger export, assert job created + progress events received
- [ ] P4.4 All test plans in `testplan.md` executed and passing

## P5 — Documentation & Cleanup
- [ ] P5.1 Update `PLATFORM_ASSESSMENT.md`: mark 1.6 + M7 resolved; correct stale "delegates entirely to WASM" claim
- [ ] P5.2 Update `docs/project-context.md` export section (requires human approval — flag, don't edit autonomously)
- [ ] P5.3 Add export-pipeline section to README if user-facing behavior changed
- [ ] P5.4 Cross-check: architecture ↔ code ↔ tasks ↔ testplan (log in changelog)
- [ ] P5.5 Final `cargo test --workspace`, `bun run test`, `bun run typecheck` green
