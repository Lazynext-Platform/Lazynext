# 🧭 Feature Motto: GPU Rendering & WASM Integration

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening
> **Applies during**: Stage 5 (Build)

## DO ✅
- Verify before claiming — the GPU pipeline already exists; don't reinvent it
- Write tests that validate the GPU bridge delegates correctly to WASM
- Document the real pipeline so future assessments don't repeat the false "stub" claim
- Keep the GPU → CPU fallback path functional (not every browser supports WebGPU)

## DON'T ❌
- Do NOT rewrite working GPU bridge code (gpu-renderer.ts, wasm-compositor.ts) — verify and test, don't rebuild
- Do NOT touch the Rust compositor (it already works — verify it, don't change it)
- Do NOT port JS animation/command files that already call WASM — they're already correct
- Do NOT remove the CPU fallback path — it's the graceful degradation pattern

## If stuck
- If the GPU activation test fails because WebGPU isn't available in the test environment, mock it
- If an animation/command file truly duplicates Rust logic (not just UI dispatch), flag it for a future feature — don't fix it in this scope
