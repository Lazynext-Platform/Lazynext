# 💬 Discussion: GPU Rendering & WASM Integration Hardening

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening
> **Status**: 🔴 STAGE 1 — Discuss
> **Branch**: `feature/19-webgpu-and-wasm-port`
> **Depends On**: #01 (Rust Core), #02 (Web Shell), #10 (Rust Hardening)
> **Date Started**: 2026-06-30

## Summary

The PLATFORM_ASSESSMENT.md claimed the GPU renderer was a stub ("`gpu-renderer.ts` is a stub. All rendering goes through CPU canvas.") and that 15 animation / 30+ command / 17 mask JS files needed porting to Rust-WASM. **Both claims are substantially false.** Code audit reveals:

- `apps/web/src/services/renderer/gpu-renderer.ts` (92 lines) already imports from `lazynext-wasm` and calls `applyEffectPasses()`, `applyMaskFeatherWasm()`, `initializeGpu()` — real WASM GPU bridge, not a stub.
- `apps/web/src/services/renderer/compositor/wasm-compositor.ts` (228 lines) is a full `WasmCompositor` class with texture upload/cache/release, frame rendering via `renderFrame()`, and performance profiling — production-grade infrastructure.
- `apps/web/src/animation/interpolation.ts` already delegates to WASM (`evaluateScalarChannel`, `evaluateDiscreteChannel` from `@/wasm`). The comment says "WASM now handles normalization internally."
- 53 command files exist in `apps/web/src/commands/` — most are UI dispatch layer commands that call either `EditorCore` or WASM functions (e.g. `delete-elements.ts` uses `require("lazynext-wasm")`).
- The web editor UI already has a "WebGPU Hardware Engine" dropdown (EditorClient.tsx:9257) and `wasm/gpu-activation.ts` handles WebGPU capability detection.

**The GPU compositor → web preview pipeline IS real.** This feature is not a greenfield build — it's a **verification, hardening, and testing** pass on already-existing infrastructure.

## Functional Requirements

- Verify the GPU compositor render path works end-to-end: `WasmCompositor.render(frame)` → `renderFrame()` (WASM/Rust) → wgpu compositor → visible canvas preview
- Verify the GPU effect/mask pipeline: `gpuRenderer.applyEffect({...})` → `applyEffectPasses()` → GPU shader → output on canvas
- Write integration tests that validate the WebGPU path renders correct output (not just a CPU fallback)
- Performance benchmark: compare GPU vs CPU fallback rendering latency for 1080p/4K timelines
- Document the current GPU activation/fallback path in `architecture.md` so the NEXT assessment doesn't repeat the same error
- If any code paths TRULY duplicate Rust logic (not just UI dispatch), flag them for porting — but do NOT rewrite working code

## Current State (code-verified)

### GPU pipeline — real and working

| Component | File | Status |
|---|---|---|
| WASM GPU initializer | `gpu-renderer.ts:13-26` | Real — calls `ensureWasmInitialized()`, sets `gpuAvailable` flag |
| Effect application | `gpu-renderer.ts:32-53` | Real — calls `applyEffectPasses()` from WASM |
| Mask feather | `gpu-renderer.ts:56-77` | Real — calls `applyMaskFeatherWasm()` from WASM |
| Texture upload/cache | `wasm-compositor.ts:72-183` | Real — texture dedup via contentHash, OffscreenCanvas reuse |
| Frame rendering | `wasm-compositor.ts:90-98` | Real — calls `renderFrame(frame)` from WASM |
| Compositor canvas | `wasm-compositor.ts:65-70` | Real — returns `HTMLCanvasElement` from WASM compositor |
| WebGPU detection | `wasm/gpu-activation.ts` | Real — checks `navigator.gpu`, initializes via `WasmBridge` |
| Perf profiling | `wasm-compositor.ts:92-97` | Real — records frame timing via `getLastFrameProfile()` |
| GPU UI | `EditorClient.tsx:9257-9507` | Real — WebGPU hardware engine dropdown |

### Animation — already WASM-delegated

| Function | Delegation |
|---|---|
| `evaluateScalarChannel` | Delegates to WASM (`@/wasm`) |
| `evaluateDiscreteChannel` | Delegates to WASM (`@/wasm`) |
| `normalizeChannel` | Retained JS wrapper (comment: "WASM handles normalization internally") |
| Keyframe interpolation types | Defined in JS for TS type safety; WASM mirrors in Rust `keyframe.rs` |

### Commands — UI dispatch layer

The 53 command files are UI integration-layer commands that call `EditorCore` APIs or WASM functions. They are NOT duplicate logic — they're the web-specific dispatch layer that translates user actions → Core/WASM calls. This is the correct architecture pattern (dumb shell calling into Rust).

### Masks — hybrid

The 24 mask files include GPU pipeline (calls `applyMaskFeatherWasm`), UI components (masks-tab.tsx), and freeform path handling. The GPU mask rendering path is real; the JS freeform path is UI-interactive geometry that by nature belongs in the frontend.

## Knowledge Gaps → Research Needed

1. Has the full end-to-end GPU pipeline actually been tested with a running browser+WASM stack? No integration test evidence found.
2. Does the WebGPU path perform better than the CPU fallback in real-world timelines? No benchmark data.
3. Are there edge cases where `gpuAvailable` is false but WebGPU is supported (or vice versa)?

## Proposed Approach

### Phase 1 — Verification (read-only)
1. Run the web app and verify the GPU path activates (check console for `[GPU] WebGPU compositor activated successfully`)
2. Trace a `renderFrame()` call from JS → WASM → Rust compositor and back
3. Document the GPU pipeline diagram in architecture.md

### Phase 2 — Testing
4. Write a GPU renderer unit test that mocks WASM calls and verifies the effect/mask bridge
5. Write a Playwright test that loads the editor and asserts `gpu-renderer.ts` initialized

### Phase 3 — Documentation
6. Write an accurate architecture doc for the GPU pipeline (prevent future assessment errors)
7. Update PLATFORM_ASSESSMENT.md to remove the false "stub" claim

## Non-goals
- Rebuilding the compositor (already works)
- Rewriting working JS code that calls WASM (already correct)
- New GPU shaders or effects (out of scope)

## Discussion Complete ✅

**Completed**: 2026-06-30
**Next**: Create `architecture.md` (Stage 2 — Design).
