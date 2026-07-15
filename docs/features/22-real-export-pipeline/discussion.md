# 💬 Discussion: Real Export Pipeline (Compositor Frames → ffmpeg)

> **Feature**: `22` — Real Export Pipeline
> **Status**: 🔴 STAGE 1 — Discuss
> **Branch**: `feature/22-real-export-pipeline` (to be created at Stage 3)
> **Depends On**: #01 (Rust Core), #02 (Web Shell), #19 (GPU/WASM Hardening)
> **Date Started**: 2026-06-30

## Summary

`PLATFORM_ASSESSMENT.md` task 1.6 says: *"Wire real export encoding — Export UI/types exist but actual video encoding delegates entirely to WASM. The export pipeline (compositor → ffmpeg) needs to flow through real frames."* Microservice task M7 says render-service "currently produces solid-color canvases."

**Code audit (2026-06-30) shows both claims are partially stale.** The export pipeline is already real on two independent paths — but the paths are **divergent**, and the **web path bypasses the GPU compositor**, losing all per-clip transforms/effects. This feature closes that gap so every export — web, CLI, desktop — renders through the **same GPU compositor frames** and encodes the result.

This is the highest-leverage remaining work: a video editor's core value is producing correct video output. It unblocks #25 (CLI render tests) and #31 (E2E integration test).

## Functional Requirements

- **F1 — Single source of truth for rendering.** Every export path (web render-service, CLI `dispatch_export`, desktop) produces frames from the GPU compositor (`CoreEngine::render_frame`), not from a re-derived ffmpeg overlay graph.
- **F2 — Web export uses compositor frames.** The web export flow must ship compositor-rendered RGBA frames to ffmpeg (via the render-service), preserving per-clip position, scale, rotation, opacity, effects, masks, and animation. Currently these are dropped.
- **F3 — Correct duration.** Export must render exactly the timeline's frame range, not a hardcoded default. (Today `ExportPipeline::export` ignores the caller's frame count and uses `framerate * 10`.)
- **F4 — Format/bitrate passthrough.** Caller selects format (MP4/ProRes/DCP/AAF/MOV/GIF) and bitrate; today `dispatch_export` hardcodes `Mp4` + `8000 kbps`.
- **F5 — Embedded C2PA.** Provenance manifest embedded in the MP4/MOV `c2pa` box (production), not only a sidecar JSON (current dev behavior).
- **F6 — Progress + cancellation.** SSE progress already exists for render-service; ensure it reports compositor-frame progress, and add cancellation.
- **F7 — Integration test.** A test that actually spawns ffmpeg, renders N frames through the compositor, and asserts a valid, playable output file with correct duration and dimensions.

## Current State (code-verified)

### Rust path — REAL (CLI / desktop)
| Component | File:line | Status |
|---|---|---|
| ffmpeg subprocess pipe | `rust/crates/export/src/pipeline.rs:22-80` | Real — spawns ffmpeg, writes RGBA to stdin, validates frame size, handles stderr/exit |
| GPU frame rendering | `rust/core/src/engine.rs:186-306` | Real — builds `FrameDescriptor` from timeline, evaluates animated props, `render_frame_to_texture`, CPU readback, DeckLink pump |
| Export dispatch | `rust/core/src/engine.rs:407-477` | Real — wires `render_frame` → `ExportPipeline::export`, mpsc progress. **BUG: ignores caller total_frames; hardcodes `Mp4`/`8000`** |
| Format encoders | `rust/crates/export/src/{mp4,prores,dcp,aaf,encoder}.rs` | Real per-format ffmpeg arg builders |

### Node path (render-service) — REAL but divergent
| Component | File:line | Status |
|---|---|---|
| Queue + worker | `services/render-service/src/index.ts:113-297` | Real — BullMQ, Redis (degrades gracefully), SSE progress, local filesystem upload |
| ffmpeg filtergraph | `index.ts:308-421` | Real — builds `filter_complex` with `overlay` + `amix` **only for clips with `http` URLs**, at `0:0`, no transforms/effects/opacity/animation |
| Synthetic fallback | `index.ts:390-406` | Test pattern when no real clip URLs — this is the "solid-color canvas" M7 referred to |
| C2PA signing | `index.ts:440-522` | Real but **sidecar `.c2pa.json` + self-signed HMAC** (dev); not embedded in container |

### The core problem
The web export never calls the GPU compositor. It reconstructs the timeline inside ffmpeg's `overlay` filter, which:
- cannot express animated position/scale/rotation/opacity,
- cannot express GPU effects, masks, blend modes, color grading,
- drops any clip whose `url` is not an `http(s)` URL (blob/OPFS/relative assets invisible).

So a user's edited timeline and the exported video **diverge**. This is the real 1.6 gap.

## Proposed Approach (high-level — detailed in architecture.md)

1. **Define a frame-source contract** — a `RenderFrameSource` trait (Rust) / interface (TS) yielding RGBA for a frame index. The compositor already satisfies this (`CoreEngine::render_frame`).
2. **Make `ExportPipeline::export` accept `total_frames`** (remove the `framerate * 10` default) and an `ExportConfig` that the caller controls (format, bitrate).
3. **Render-service frame bridge** — add an endpoint/mode where the worker pulls compositor frames (rendered server-side via a headless wgpu context, OR shipped from the browser via WASM compositor as a frame stream) and pipes them to ffmpeg stdin, replacing the `overlay`-only path when the timeline uses transforms/effects.
4. **C2PA embedding** — switch from sidecar JSON to embedded `c2pa` box via `c2pa-node` (already a documented production target).
5. **Integration test** — a Rust test (`rust/tests/`) + a render-service test that run ffmpeg and validate output.

> **Open question for architecture stage**: Where do web export frames originate — (a) browser WASM compositor streams frames to render-service over HTTP, or (b) render-service runs a headless wgpu compositor server-side from the CRDT timeline? Option (b) keeps "Rust owns all logic" cleanly but needs a GPU/CI environment; (a) reuses the user's GPU but is bandwidth-heavy. This is the key design decision.

## Non-Goals
- New effects, blend modes, or export formats (existing set is sufficient).
- Replacing BullMQ/Redis or SSE (working and production-grade).
- Real-time preview changes (covered by #19).
- Social publishing changes (out of scope).

## Dependencies
- #01 Rust Core (compositor, export crate) ✅
- #02 Web Shell (export UI/types) ✅
- #19 GPU/WASM hardening (verified the compositor is real) ✅
- `ffmpeg` binary present in the run environment (CI image + Docker).

## Risks / Edge Cases
- **Headless GPU in CI**: wgpu on CI runners may fall back to software; integration test must tolerate CPU-compute backends.
- **Large frame streams over HTTP**: memory/backpressure if streaming browser→server; need chunked upload.
- **Audio sync**: compositor renders video frames only; audio must be muxed separately and stay in sync (amix path already exists).
- **C2PA cert**: production embedding needs a CA-signed cert; dev keeps self-signed.

## Lessons from Previous Features
- From #19: *"Verify before documenting — the assessment was stale."* Same pattern here: 1.6/M7 overstated the gap. We audit code first, then scope only the true gap.
- From #17: *"Zero mocks in production code."* The synthetic test-pattern fallback in render-service is acceptable only as a degraded path, not as the real export — must not ship as the default for real timelines.

## Discussion Complete ✅

**Completed**: 2026-06-30
**Next**: Create `architecture.md` (Stage 2 — Design), starting by resolving the **Open Question** above (frame-origin decision) with the human.
