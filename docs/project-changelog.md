# 📋 Project Changelog

> **Project**: Lazynext
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-06-30

---

## [Unreleased] — 2026-06-30 (Post-#09 hardening pass)

### Added
- **Feature #10 — Rust Core Hardening**: completed CRDT conflict-resolution TODO in `nle_state.rs` (+130 lines), fixed `temporal-versioning` merge bug (clips no longer silently land on track 0), added first-time tests for gpu/masks/temporal-versioning/mcp/cli/wasm, wired SAM2 ONNX inference path, VST3 `libloading` host, and C2PA manifest signing.
- **Feature #11 — Microservices Hardening**: fixed critical bugs across 4 services, wired real video-generation path in generative-studio, render-service OpenTelemetry tracing.
- **Feature #12 — Desktop App Hardening**: wired AI Copilot "Run Command" path in the GPUI editor.
- **Feature #13 — Mobile App Hardening**: added Android Kotlin native module (`MyModule.kt`, +113) and a real web bridge (`MyModule.web.ts`, +77) replacing the JS mock.
- **Feature #14 — Browser Extension Completion**: replaced mock project list with real API fetch; hardened capture overlay against non-URL `src` crashes.
- **Feature #15 — AI Editor Real API**: wired web editor AI chat to the real API; added desktop AI path, MCP protocol tests, and mobile tests.
- **Feature #16 — Final Gaps (SDK / External Deps)**: wired UniFFI bindings, SAM2 ONNX runtime, VST3 `libloading`, and E2E integration tests (`rust/tests/e2e_integration_tests.rs`).
- **Feature #17 — Platform-wide Mock Removal + Audit Fixes**: removed all remaining mock/stub/placeholder blocks from production paths; comprehensive CI/CD, infrastructure, and monitoring audit fixes.
- **Feature #18 — AI-Driven Editing (End-to-End Chronos Pipeline)**: initial build shipped (12/18 tasks). CRDT patch adapter fixes silent no-op where all AI orchestrator patches were rejected; `apply_color_grade` handler wired; SSE streaming endpoint with per-step progress; `dryRun` preview mode; frontend streaming client; 4 Rust round-trip + 2 Playwright E2E tests. Full Mastery lifecycle docs. 6 UI/docs tasks remain.
- **Feature #22 — Real Export Pipeline (Compositor Frames → ffmpeg)**: web exports now flow through the same GPU compositor used for preview (WYSIWYG) instead of bypassing it. `ExportPipeline::export` takes caller-controlled `total_frames` (removed `framerate*10` default); `CoreEngine::dispatch_export` accepts format/bitrate/total_frames; CLI gains `--bitrate`; web `export/route.ts` → `/api/v1/export` with full payload + new `frame-stream-export.ts` (ordered chunked RGBA + 503 backpressure); render-service gains `frame-export.ts` (in-memory job manager, codec matrix mirroring `encoder.rs`) + `POST /:jobId/frames`, `/frames/end`, `DELETE /:jobId`. 2 real-ffmpeg Rust integration tests (ffprobe-validated) + 11 render-service unit tests. Resolves `PLATFORM_ASSESSMENT.md` 1.6 + M7.

### Changed
- Roadmap statuses brought in sync with `main` — features 10-14 flipped from 🔴 Not Started → 🟢 Complete; 15-17 added.
- Documentation reconciliation pass: `PLATFORM_ASSESSMENT.md` body (which still used the pre-hardening 75%/1%/15%/45% figures and contradicted its own revised top section) brought in line with the Summary Table — added a snapshot notice, corrected all 10 per-format headers, and rewrote the 4 stale "Current State" paragraphs (desktop, mobile, browser, API gateway).
- `project-context.md` desktop scope line corrected to match the reconciled assessment (real GPUI app + AI Copilot wiring; full editor pending).
- Created `docs/features/17-platform-mock-removal/summary.md` (was referenced by the roadmap but had no backing folder); removed the empty `fix-all-remaining-gaps` cruft folder.

### Fixed
- Zero `mock`/`stub`/`placeholder` references remain in production code paths (verified by workspace search; only 3 explanatory code comments remain in `compositor/transforms3d.rs` and `plugin/wasm_sandbox.rs`).

### Removed
- All remaining mock data blocks, broken routes, and dead `mock_args` naming (renamed to `render_args` in the CLI).

---

## [0.1.0] — 2026-06-30 (Mastery Framework Adoption)

### Added
- **Mastery Development Framework** — Adopted mid-project. Full docs structure set up: project-discussion, project-context, project-motto, project-roadmap, project-changelog
- **AGENTS.md** — Regenerated following Mastery template for AI agent orientation
- **process-overrides.md** — Documented any project-specific process customizations
- Archived pre-Mastery docs to `docs/_archive/`

---

## Pre-Mastery — Prior Work (Retroactive)

Major areas completed before Mastery adoption (documented as retroactive `summary.md` files):

| # | Area | Status | Completion |
|---|---|---|---|
| 01 | Rust Core & Crates | Complete | ~75% |
| 02 | Web App Shell | Complete | ~85% |
| 03 | API Gateway | Complete | ~80% |
| 04 | CLI Renderer | Complete | ~75% |
| 05 | MCP Server | Complete | ~75% |
| 06 | Infrastructure & CI/CD | Complete | ~80% |
