# 🪞 Review: Real Export Pipeline (Feature #22)

> **Feature**: `22` — Real Export Pipeline
> **Merged**: 2026-06-30 → `main`
> **Branch**: `feature/22-real-export-pipeline` (retained)

## Summary
Routed web video export through the same GPU compositor used for preview (WYSIWYG), fixing the core gap that exports previously bypassed transforms/effects/animation. Resolved `PLATFORM_ASSESSMENT.md` tasks 1.6 and M7.

## What Went Well
- **Verify-before-document** paid off again: the assessment overstated the gap (claimed "delegates entirely to WASM" / "solid-color canvases"). Auditing the real code first shrank scope from "build an export pipeline" to "wire the web path to the existing pipeline + fix 4 concrete bugs."
- **One renderer, two encoders**: keeping the browser WASM compositor as the single frame source and adding render-service as the encoder preserved the "Rust owns all logic; apps are shells" invariant cleanly.
- **Testability**: isolating the frame-buffer/codec logic in `frame-export.ts` (pure functions) yielded 11 fast unit tests; the ffmpeg integration test with ffprobe gives real confidence the output is valid.

## What Went Wrong / Was Tricky
- **TS 5.7 `Uint8Array<ArrayBufferLike>` typing**: the stricter lib broke both `BodyInit` and `BlobPart` assignment. Solved by copying into a fresh `ArrayBuffer`. Cost ~1 iteration; worth a note in the codebase for the next person.
- **Express 5 `req.params` typing as `string | string[]`**: easy to miss; existing code used `as string` casts — matched the pattern.
- **The 12k-line `EditorClient.tsx`**: integrating frame capture there without a running browser to smoke-test was the riskiest change. Mitigated by keeping the MediaRecorder path as an automatic fallback so a frame-stream failure degrades gracefully rather than breaking export entirely.

## Key Lessons to Carry Forward
1. **The assessment is stale on many items** — always grep/read the actual code before scoping a feature. Several backlog items (#23, #25) may already be largely satisfied and need only verification + small gaps, not a full build.
2. **Graceful-degradation-first for risky integrations**: when you can't runtime-test a change, make it the *preferred* path with a known-good fallback, so failure is non-catastrophic.
3. **Mirror Rust↔TS codec/format matrices explicitly**: render-service's `codecForFormat` is documented as mirroring `encoder.rs` — when one changes, the other must too. Consider generating this from a single source in future.

## Follow-ups (not blockers)
- P4.3: Playwright browser→render-service E2E export test.
- TC12: `c2pa-node` embedded manifest (new dependency — parked).
- Audio muxing for the frame-stream path (currently video-only; legacy path retains amix).
- `project-context.md` export section refresh (needs human approval).
