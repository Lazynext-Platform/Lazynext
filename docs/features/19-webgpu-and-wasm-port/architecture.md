# 🏗️ Architecture: GPU Rendering & WASM Integration

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening
> **Status**: FINALIZED
> **Note**: This documents the *actual* pipeline that already exists (PLATFORM_ASSESSMENT incorrectly called it a stub).

---

## GPU compositor → web preview pipeline (verified real)

```
┌─────────────────────────────────────────────┐
│  EditorClient.tsx                            │
│  wasm-player.tsx                             │
│  (WebGPU Hardware Engine dropdown)           │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│  wasm/gpu-activation.ts                     │
│  Detect navigator.gpu → init via WasmBridge │
└────────────────────┬────────────────────────┘
                     │ initCompositor(width, height)
                     ▼
┌─────────────────────────────────────────────┐
│  services/renderer/compositor/               │
│  wasm-compositor.ts (228 lines)             │
│                                             │
│  WasmCompositor:                            │
│  • ensureInitialized(w,h)                   │
│  • syncTextures(TextureUploadDescriptor[])  │
│  • render(FrameDescriptor)                  │
│  • getCanvas(): HTMLCanvasElement           │
│                                             │
│  Texture cache: Map<id, {canvas, hash}>     │
└────────────────────┬────────────────────────┘
                     │ uploadTexture/renderFrame (lazynext-wasm)
                     ▼
┌─────────────────────────────────────────────┐
│  rust/wasm/src/                             │
│  WASM bridge → compositor bindings          │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│  rust/crates/compositor/src/compositor.rs   │
│  render_frame_to_texture()                  │
│  render_frame()                             │
│  17 blend modes, JFA masks, MSDF text       │
│  wgpu → GPU surface                         │
└─────────────────────────────────────────────┘
```

## Effect / mask GPU path

```
  Editor canvas → FrameDescriptor
        │
        ▼
  gpu-renderer.ts
        │
        ├── applyEffect({source, passes})
        │   → applyEffectPasses() (WASM)
        │   → compositor wgpu shaders (11 effects)
        │
        └── applyMaskFeather({maskCanvas, feather})
            → applyMaskFeatherWasm() (WASM)
            → compositor JFA signed-distance-field masking
```

## Fallback path

When `gpuAvailable === false` (no WebGPU support, WASM init failure, or worker thread incompatible):
- `gpuRenderer.applyEffect()` returns `source` unchanged (CPU-canvas pass-through)
- `gpuRenderer.applyMaskFeather()` returns `maskCanvas` unchanged
- All rendering falls back to CPU 2D canvas in the editor's main render loop

## WebGPU detection chain

1. `wasm/gpu-activation.ts` checks browser support (`navigator.gpu`)
2. `WasmBridge` initializes the compositor from wasm-bindgen exports
3. On success: `gpuAvailable = true`, console: `[GPU] WebGPU compositor activated successfully`
4. On failure: `gpuAvailable = false`, console warn + CPU fallback

## Animation evaluation — already WASM-delegated

```
  interpolation.ts:evaluateScalarChannel(channel)
        → @/wasm → Rust keyframe.rs::evaluate_at()
```

The JS `animation/` files are now thin TS type wrappers around WASM calls.
No duplicate interpolation logic remains.

## Key architectural rules (to prevent future false assessments)

1. **Every `gpu-renderer.ts` call goes through `lazynext-wasm`** — it's a bridge, not an independent renderer
2. **The JS `animation/` directory provides TS types + UI glue** — all math is in Rust
3. **Commands in `commands/` are UI dispatch, not business logic** — they call `EditorCore` or WASM functions
4. **The `wasm-compositor.ts` class IS the web-side compositor bridge** — it's not a stub; it manages texture lifecycle (upload, cache, release)

## Files impacted by this feature

| Change | File | Description |
|---|---|---|
| Document | `docs/features/19-*/architecture.md` | This doc — GPU pipeline reference |
| Test (new) | `apps/web/src/services/renderer/__tests__/gpu-renderer.test.ts` | Unit test mocking WASM calls |
| Test (update) | `apps/web/tests/e2e/editor.spec.ts` | Playwright test for GPU init |
| Update | `PLATFORM_ASSESSMENT.md` | Remove false "stub" claim; reference this doc |
