# 🧪 Testplan: GPU Rendering & WASM Integration

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening

## Acceptance criteria

| # | Criterion | Verified by |
|---|---|---|
| AC1 | GPU renderer initialises without error in WebGPU-capable browsers | Manual A.1 |
| AC2 | `gpuRenderer.applyEffect({source, passes})` delegates to WASM when `gpuAvailable=true` | B.1 unit test |
| AC3 | `gpuRenderer.applyEffect()` returns source unchanged when `gpuAvailable=false` | B.1 unit test |
| AC4 | Playwright test confirms GPU init runs on editor load | B.2 E2E |
| AC5 | PLATFORM_ASSESSMENT no longer claims GPU renderer is a stub | C.1 doc update |
| AC6 | Typecheck, lint, and existing test suite pass (0 regressions) | CI check |

## Test cases

### TC1: GPU renderer delegates to WASM (unit)
**Setup**: Mock `lazynext-wasm` exports (`applyEffectPasses`, `applyMaskFeatherWasm`).  
**Input**: `gpuRenderer.applyEffect({source: canvas, passes: [{shader: "screen", uniforms: {}}]})`  
**Expected**: Mock `applyEffectPasses` is called with serialised passes. Returns the mock canvas output.  
**Status**: [ ] Pass / [ ] Fail

### TC2: GPU passthrough when unavailable (unit)
**Setup**: `gpuAvailable = false` (initializer not called).  
**Input**: `gpuRenderer.applyEffect({source: canvas, passes: [...]})`  
**Expected**: Returns `source` unchanged, mock NOT called.  
**Status**: [ ] Pass / [ ] Fail

### TC3: GPU activation on editor load (Playwright E2E)
**Setup**: Web app with WebGPU browser.  
**Steps**: 1. Open editor. 2. Check console.  
**Expected**: Console contains `[GPU] WebGPU compositor activated successfully` or a graceful degradation message.  
**Status**: [ ] Pass / [ ] Fail

### TC4: No regression on existing test suite
**Setup**: Full workspace.  
**Steps**: Run `cargo test --workspace`, `bun test`, `bun typecheck`.  
**Expected**: All pass (53 Rust test bins, 351 web tests, 0 tsc errors).  
**Status**: [ ] Pass / [ ] Fail
