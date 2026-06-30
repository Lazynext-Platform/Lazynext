# 📝 Changelog: Real Export Pipeline (Feature #22)

> Running log of implementation. Empty until Stage 5 (Build) begins — which requires Stage 4 human Approve first.

## Session Note — 2026-06-30 (Build — Phases P1–P5)
- **Who**: AI Agent (opencode)
- **Worked On**: Feature #22 implementation across Rust core, web app, and render-service.
- **Built**:
  - **P1 (Rust)**: `ExportPipeline::export` now takes `total_frames` (removed `framerate*10` default); `CoreEngine::dispatch_export` accepts `format`/`bitrate_kbps`/`total_frames`; CLI gains `--bitrate`; MCP-server caller updated.
  - **P2 (Web)**: `export/route.ts` → `POST /api/v1/export` with full payload; new `services/export/frame-stream-export.ts` (ordered chunked RGBA upload + 503 backpressure retry + `/frames/end`); `EditorClient.startExport` async, tries render-service streaming first, keeps MediaRecorder→webm as fallback.
  - **P3 (render-service)**: new `frame-export.ts` (in-memory ordered job manager, `codecForFormat`+`buildRawVideoEncodeArgs` mirroring `encoder.rs`, ffmpeg finalize, backpressure cap); new routes `POST /:jobId/frames`, `/frames/end`, `DELETE /:jobId`; legacy timeline-overlay path preserved.
  - **P4 (Tests)**: `rust/crates/export/tests/export_pipeline.rs` — 2 real-ffmpeg integration tests (ffprobe-validated), green; `services/render-service/tests/frame-export.test.ts` — 11 unit tests, green.
  - **P5 (Docs)**: `PLATFORM_ASSESSMENT.md` 1.6 + M7 marked resolved/corrected.
- **Verification**: `cargo check/clippy/test` (export, core) green; `cargo fmt` clean; `bun run typecheck` (apps/web) clean; render-service `tsc --noEmit` clean; render-service `bun test` 11/11.
- **Stopped At**: Build complete on `feature/22-real-export-pipeline` (5 commits). Ready for Stage 6 (Ship) — needs human-approved merge to `main`.
- **Blockers**: None. `project-context.md` export-section update (P5.2) requires human approval — flagged, not edited. Playwright browser E2E (P4.3) deferred (needs running stack). `c2pa-node` embedding (TC12) parked (new dependency).
- **Next Steps**: Human reviews diff → merge to main → update `project-roadmap.md` (mark #22 🟢) + `project-changelog.md`.

### Cross-check (P5.4)
- **Architecture ↔ Code**: Option (A) browser-streams-frames implemented as designed; `dispatch_export` signature matches architecture contract; render-service codec matrix mirrors `encoder.rs`. ✅
- **Tasks ↔ Code**: all P1–P5 items reflected in code; deferred items explicitly marked. ✅
- **Testplan ↔ Tests**: 12/18 TC verified; 6 deferred (documented above). ✅
- **Changelog ↔ Session**: matches commits. ✅
- **Dependencies ↔ Architecture**: no new deps added (WebCodecs, c2pa-node, mp4-muxer all deferred per decisions). ✅
