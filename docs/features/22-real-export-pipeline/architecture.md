# 🏗️ Architecture: Real Export Pipeline (Compositor Frames → ffmpeg)

> **Feature**: `22` — Real Export Pipeline
> **Status**: 🟡 STAGE 2 — Design
> **Date**: 2026-06-30
> **Depends On**: #01, #02, #19

## Design Principle

**WYSIWYG export: the bytes written to ffmpeg are produced by the same GPU compositor that renders the live preview.** No re-derivation of the timeline inside an ffmpeg `overlay` graph. This is the only way to guarantee the exported video matches what the user sees (transforms, effects, masks, blend modes, animation, opacity).

The Rust compositor already renders frames for preview (`CoreEngine::render_frame` native; `WasmCompositor.renderFrame` in browser). **Export = capture those frames + pipe to ffmpeg.** Encoding is the only new work; rendering is reused.

## Key Design Decision — Where do web export frames originate?

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| **(A) Browser compositor → stream** ✅ chosen | Browser WASM compositor renders frame N, captures RGBA, streams chunks to render-service, which pipes to ffmpeg | WYSIWYG exact; reuses user GPU; no server GPU/media-decode lift; matches "apps are dumb shells" | Bandwidth (RGBA is heavy — mitigate with chunking + backpressure) |
| (B) Server-side headless compositor | render-service loads CRDT timeline + media, runs Rust compositor headless (wgpu) | Centralized, works for queued jobs when user is offline | Needs GPU/media-decode in container; risk of divergence from preview; large infra lift |
| (C) ffmpeg-only overlay graph (status quo) | render-service rebuilds timeline as ffmpeg `overlay`/`amix` | No app changes | Cannot express rotation/effects/masks/blend/animation → **rejected**, this is the bug we're fixing |

**Decision: Option (A) is canonical for web.** Option (B) is documented as a future enhancement for background/queued exports (deferred — out of scope here). Native CLI/desktop already use the compositor natively via `dispatch_export`.

## Architecture (Data Flow)

### Native path — CLI & Desktop (fix existing)
```
CoreEngine::dispatch_export(output_path, format, bitrate, total_frames)
   ├── locks NLEState, computes total_frames from timeline
   ├── builds ExportConfig { format, width, height, framerate, bitrate, output_path }   ← F4
   └── ExportPipeline::export(total_frames, render_closure)
         └── for frame in 0..total_frames:
               CoreEngine::render_frame(frame)  → RGBA            ← GPU compositor (reused)
               ffmpeg.stdin.write(RGBA)
               progress_tx.send(frame)                            ← F6
         ffmpeg closes → valid file at output_path
```
Fixes vs. today: `ExportPipeline::export` takes `total_frames` param (no more `framerate*10`); `dispatch_export` accepts `format`/`bitrate` (no more hardcoded `Mp4`/`8000`).

### Web path — Browser compositor → render-service (new)
```
EditorClient.startExport({format, bitrate})
   → POST /api/export  (apps/web/src/app/api/export/route.ts)        ← FIX: send timeline meta + format
   → returns jobId
   → browser opens render stream:
       for frame in 0..total_frames:
          wasmCompositor.renderFrame(frame) → OffscreenCanvas
          rgba = ctx.getImageData() (or WASM readback)               ← same compositor as preview
          POST /api/v1/export/:jobId/frames  (chunked, sequence, backpressure)
       POST /api/v1/export/:jobId/frames/end
   render-service worker:
       spawns ffmpeg (ExportEncoder args, format from job)
       writes received RGBA chunks → ffmpeg.stdin in order
       on end → close stdin → upload (local filesystem) → C2PA embed → SSE 'completed'
```
Fallback if render-service offline: browser encodes locally via `WebCodecs` + `mp4-muxer` (graceful degradation, no mock).

## Components to Change

| # | File | Change |
|---|---|---|
| A1 | `rust/crates/export/src/pipeline.rs` | `export()` signature: add `total_frames: u32` param; remove `framerate*10` default |
| A2 | `rust/core/src/engine.rs` | `dispatch_export()`: accept `format: ExportFormat`, `bitrate_kbps: u32`, `total_frames: u32`; pass through to pipeline |
| A3 | `rust/cli/src/main.rs` | Pass `--format`/`--bitrate` through to `dispatch_export`; remove `unsafe set_var` (see #25) |
| A4 | `apps/web/src/app/api/export/route.ts` | Call `/api/v1/export` (not `/jobs`); include `{projectId, format, bitrate, width, height, framerate, totalFrames}` |
| A5 | `apps/web/src/components/editor/EditorClient.tsx:2523` | `startExport` → drive frame-by-frame render+stream using `WasmCompositor`; report progress |
| A6 | `services/render-service/src/index.ts` | New `POST /api/v1/export/:jobId/frames` (append-only ordered RGBA) + `/frames/end`; worker spawns ffmpeg from ExportEncoder-equivalent args (port `build_ffmpeg_args` to honor format); keep amix audio mux as secondary input |
| A7 | `services/render-service/src/index.ts` | C2PA: switch sidecar JSON → embedded box via `c2pa-node` when `C2PA_SIGNING_CERT_*` present; keep sidecar as dev fallback |
| A8 | `services/render-service/src/index.ts` | Cancel: `DELETE /api/v1/export/:jobId` kills ffmpeg child + discards |

## Interface Contracts

### `POST /api/v1/export` (amended)
Request: `{ projectId, format: "mp4"|"prores"|"mov"|..., bitrate_kbps, width, height, framerate, totalFrames }`
Response: `{ jobId }` (202). Job is created in `awaiting_frames` state.

### `POST /api/v1/export/:jobId/frames` (new)
Request body (binary): `X-Frame-Seq: <n>` header + raw RGBA body (`width*height*4` bytes). Append-only; out-of-order rejected (400). Backpressure: worker applies backpressure via 503 if ffmpeg stdin blocks.

### `POST /api/v1/export/:jobId/frames/end` (new)
Triggers ffmpeg stdin close → encode finalize → upload → C2PA → SSE `completed`.

### Rust `ExportPipeline::export` (amended signature)
```rust
pub async fn export<F, Fut>(&self, total_frames: u32, render_frame: F) -> Result<()>
where F: FnMut(u32) -> Fut, Fut: Future<Output = Vec<u8>>;
```

## Config / Env
- Existing: `RENDER_SERVICE_URL`, `OUTPUT_DIR`, `MEDIA_BUCKET`.
- New: `C2PA_SIGNING_CERT_ISSUER`, `C2PA_SIGNING_CERT_KEY` (prod embed); absent → dev sidecar.
- `EXPORT_FRAME_STREAM_MAX_BYTES` (backpressure cap, default 64 MiB).

## Trade-offs Documented
- **RGBA bandwidth**: 1080p RGBA ≈ 8 MB/frame. Mitigations: chunked POST with sequence numbers; optional client-side JPEG/WebP-frame fast path (lower fidelity) behind a flag. Pixel-exact RGBA is default.
- **Audio**: compositor renders video only. Audio is muxed separately — render-service keeps the existing `amix` path as a *secondary* ffmpeg input (`-i` audio mix), combined with the RGBA video stream. Sync handled by ffmpeg timestamps.
- **Headless GPU in CI**: native integration test runs with wgpu CPU backend (`DX12`/`Vulkan` absent → ``wgpu` backs down to compute on CPU); test asserts a valid file, not a specific pixel.

## Security
- Frame endpoint must verify the jobId exists and is in `awaiting_frames` (no spoofing of other users' jobs).
- Size validation per frame (`width*height*4`); reject oversized bodies (DoS).
- C2PA signing key is a secret — read from env/Docker secrets, never logged.

## Non-Goals (restated)
- New export formats / effects / blend modes.
- Replacing BullMQ/Redis/SSE.
- Real-time preview changes (#19).
- Server-side headless compositor (option B) — future feature.

## Open Items for Human Review (Stage 4)
1. Confirm Option (A) (browser-streams-frames) as canonical for web export.
2. Confirm C2PA embedding via `c2pa-node` is desired now (adds a dependency) vs. keeping sidecar JSON.
3. Confirm acceptable to add `POST /api/v1/export/:jobId/frames[/end]` endpoints to render-service.
