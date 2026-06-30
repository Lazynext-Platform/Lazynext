# 🧪 Test Plan: Real Export Pipeline (Feature #22)

> Acceptance criteria for "done". Every case must have a corresponding test before merge.

## Scope
Native export (CLI/desktop) + web export (browser → render-service) + render-service frame ingest + C2PA. Excludes: new formats, preview rendering (#19), social publish.

## Test Cases

| ID | Area | Case | Expected | Status |
|---|---|---|---|---|
| TC1 | pipeline.rs unit | `export(total_frames=5, …)` writes exactly 5 frames to ffmpeg stdin | ffmpeg exits 0; output duration ≈ 5/framerate | ⬚ |
| TC2 | pipeline.rs unit | `export` with render closure returning wrong-sized frame | Returns `Err("Frame N has wrong size…")` | ⬚ |
| TC3 | dispatch_export | Pass `format=ProRes`, verify ffmpeg args contain `prores_ks` + `yuv422p10le` | Args match `encoder.rs` ProRes branch | ⬚ |
| TC4 | dispatch_export | `total_frames` from timeline (3 clips, max end=90) → renders 90 frames | No `framerate*10` default used | ⬚ |
| TC5 | export/route.ts | POST `/api/export` sends `totalFrames` + `format` to `/api/v1/export` | render-service receives full payload (not just projectId) | ⬚ |
| TC6 | EditorClient | `startExport` loops frames via `WasmCompositor`, uploads chunks in order | All frames uploaded; `/frames/end` called once | ⬚ |
| TC7 | render-service | `POST /frames` out-of-order sequence → 400 | Rejected | ⬚ |
| TC8 | render-service | Frame body size ≠ width*height*4 → 400 | Rejected | ⬚ |
| TC9 | render-service | Full job: `/export` → N×`/frames` → `/end` → valid MP4 | `ffprobe` confirms playable, correct WxH + duration | ⬚ |
| TC10 | render-service | `DELETE /export/:jobId` mid-render | ffmpeg child killed; output discarded; SSE `failed`/`cancelled` | ⬚ |
| TC11 | render-service | Backpressure: flood frames past cap → 503 | Client pauses; job resumes when drained | ⬚ |
| TC12 | C2PA | With `C2PA_SIGNING_CERT_*` set → embedded c2pa box | `c2patool` reads manifest from file | ⬚ |
| TC13 | C2PA | Without cert (dev) → sidecar `.c2pa.json` | Sidecar exists; HMAC present | ⬚ |
| TC14 | Degradation | render-service offline → browser WebCodecs fallback | Local MP4 produced; no mock/empty file | ⬚ |
| TC15 | Rust integration | Real ffmpeg on CI, 2s 1080p timeline → output file | `ffprobe` duration 2.0s ±0.1, 1920x1080 | ⬚ |
| TC16 | Regression | Existing `encoder.rs` arg tests still pass | Green | ⬚ |
| TC17 | Regression | render-service existing `/api/v1/jobs` + SSE still work | Green | ⬚ |
| TC18 | WYSIWYG | Exported frame at index K matches preview canvas at K (within tolerance) | Pixel diff < threshold | ⬚ |

## Definition of Done
- All TC pass; `cargo test --workspace`, `bun run test`, `bun run typecheck`, `cargo clippy -D warnings` all green.
- No new mocks/stubs in production code (synthetic test pattern remains only as render-service degraded fallback when no frames arrive).
- `PLATFORM_ASSESSMENT.md` 1.6 + M7 marked resolved.
- Human-approved merge to `main`; feature branch retained.
