# 📝 Changelog: Real Export Pipeline (Feature #22)

> Running log of implementation. Empty until Stage 5 (Build) begins — which requires Stage 4 human Approve first.

## Session Note — 2026-06-30 (Stages 1–3 complete)
- **Who**: AI Agent (opencode)
- **Worked On**: Feature #22 planning — Discussion, Architecture, Tasks, Test Plan.
- **Key finding**: `PLATFORM_ASSESSMENT.md` tasks 1.6 and M7 are **stale**. Verified the export pipeline is already real on both the Rust path (`ExportPipeline` + `CoreEngine::render_frame` + `dispatch_export`) and the render-service path (BullMQ + ffmpeg `filter_complex` + C2PA sidecar). The TRUE gap is narrower: (a) web export calls `/api/v1/jobs` with no timeline data → falls back to synthetic test pattern; (b) web export bypasses the GPU compositor, losing transforms/effects/animation; (c) `ExportPipeline::export` hardcodes `framerate*10` duration; (d) `dispatch_export` hardcodes `Mp4`/`8000`; (e) C2PA is sidecar-only.
- **Decisions documented**: Canonical web path = browser WASM compositor streams RGBA frames to render-service (WYSIWYG, reuses preview compositor). Native path = fix existing `dispatch_export`. Server-side headless compositor deferred (future).
- **Stopped At**: Stage 3 (Plan) complete. **Awaiting Stage 4 (human Approve).**
- **Blockers**: None technical. 3 architecture decisions need human confirmation (see `architecture.md` → Open Items): (1) browser-streams-frames as canonical; (2) C2PA embed via `c2pa-node` now vs. later; (3) new `/frames` endpoints acceptable.
- **Next Steps**: On Approve → create `feature/22-real-export-pipeline`, execute tasks P1→P5, log each here.
