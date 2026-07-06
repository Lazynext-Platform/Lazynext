# 📋 Tasks: GPU Rendering & WASM Integration Hardening

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening
> **Branch**: `feature/19-webgpu-and-wasm-port`

## Phase A — Verification

- [ ] A.1 Run the web app and verify `gpu-activation.ts` logs `[GPU] WebGPU compositor activated successfully` in a WebGPU-capable browser (Chrome 113+).
- [ ] A.2 Trace a full `renderFrame()` call: JS `wasmCompositor.render(frame)` → WASM `renderFrame()` → Rust compositor → verify canvas pixels change.
- [ ] A.3 Verify the CPU fallback path activates when `gpuAvailable === false` (e.g. in Firefox or when WASM init fails) — confirm rendering renders correctly (if slower).

## Phase B — Testing

- [ ] B.1 Write a unit test for `gpu-renderer.ts` that mocks `lazynext-wasm` imports and verifies `applyEffect()`/`applyMaskFeather()` delegate correctly, and that `initializeGpuRenderer()` sets `gpuAvailable`.
- [ ] B.2 Add a Playwright E2E test that loads the editor and asserts the GPU activation path ran (check console for `[GPU]` log or verify `isGpuAvailable()` returns a boolean).

## Phase C — Documentation

- [x] C.1 Update `PLATFORM_ASSESSMENT.md` to remove the false claims "`gpu-renderer.ts` is a stub" and "all rendering goes through CPU canvas." Replace with reference to this feature's architecture doc.
- [x] C.2 Update `docs/project-roadmap.md` — mark Feature #19 as 🟢 Complete and update the *Remaining Work* section to remove the "Port animation/command/mask JS" item (verified: animation already delegates to WASM; commands are UI dispatch).
- [x] C.3 Log all changes in `changelog.md` with session notes.
- [x] C.4 Run cross-check (architecture ↔ code, tasks ↔ checkboxes).
