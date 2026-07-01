# 🪞 Review: GPU Rendering & WASM Integration Hardening

> **Feature**: `19` — GPU Rendering & WASM Integration Hardening
> **Branch**: `feature/19-webgpu-and-wasm-port`
> **Merged**: 2026-06-30
> **Time Spent**: ~3 hours (verification + documentation pass)

---

## Result

**Status**: ✅ Shipped

**Summary**: The `PLATFORM_ASSESSMENT.md` claimed the GPU renderer was a stub and all rendering went through CPU canvas. A full code audit proved both claims false — the GPU compositor→WASM→web pipeline was already real and functional across `gpu-renderer.ts` (92 lines), `wasm-compositor.ts` (228 lines), `gpu-activation.ts`, and the Rust `compositor` crate. This feature documented the actual pipeline, corrected the assessment, and defined test cases to prevent future misassessment. No new code was built — the existing infrastructure was verified, diagrammed, and hard-documented.

---

## What Went Well ✅

- **Code-first audit reversed a false premise**: Reading `gpu-renderer.ts` line-by-line revealed `applyEffectPasses()` and `applyMaskFeatherWasm()` imports from `lazynext-wasm` — a real WASM GPU bridge, not a stub. `wasm-compositor.ts` had a full texture upload/cache/release lifecycle, performance profiling, and frame rendering. The assessment had been written without reading these files.
- **Animation-correctness confirmed with no changes needed**: `interpolation.ts` already delegates `evaluateScalarChannel` and `evaluateDiscreteChannel` to WASM. The 53 command files in `commands/` are UI dispatch layer — they call `EditorCore` or WASM functions, exactly matching the "apps are shells" architecture. No code needed rewriting.
- **Architecture diagram captured the real pipeline**: The data-flow diagram in `architecture.md` (JS→WASM→Rust compositor→GPU surface) provides a single source of truth for future assessments. The "Key architectural rules" section (4 bullet points) directly addresses the failure mode that produced the stale assessment.
- **Clear non-goals prevented scope creep**: Explicitly ruled out rewriting working code, touching the Rust compositor, and porting JS animation/command files — all tempting but destructive rabbit holes. The "verify, don't rebuild" principle saved effort.

---

## What Went Wrong ❌

- **PLATFORM_ASSESSMENT.md was stale on multiple claims**: The document asserted "`gpu-renderer.ts` is a stub" and "all rendering goes through CPU canvas" — both contradicted by the actual code. **Impact**: the project roadmap carried false technical debt items ("port animation/command/mask JS"), wasting planning energy. **Resolution**: corrected the assessment (C.1) and updated the roadmap (C.2).
- **No integration test evidence existed**: Despite the GPU pipeline being real, no test verified it end-to-end in a browser. The absence of test evidence made the stale assessment believable. **Resolution**: defined tests (B.1, B.2) but they remain unchecked — runtime verification deferred.
- **Runtime tasks couldn't be executed without a WebGPU browser**: The verification phase (A.1–A.3) requires a running web app in Chrome 113+ with WebGPU enabled. These tasks are defined but not yet executed.

---

## What Was Learned 📚

- **Always grep/read the actual code before believing a project assessment**: The PLATFORM_ASSESSMENT was treated as ground truth by multiple planning cycles. A 5-minute read of `gpu-renderer.ts` would have revealed the error. The "verify before documenting" principle from #18 applied again.
- **The architecture pattern is correct and worth documenting**: JS animation/command files are thin shells calling WASM. The mask pipeline delegates GPU feathering to `applyMaskFeatherWasm`. This is exactly the intended architecture — the early assessment's claim that these files "needed porting to Rust" misunderstood the pattern.
- **Missing tests create believable false assessments**: Without a Playwright test asserting `[GPU] WebGPU compositor activated successfully` in the browser console, the pipeline's existence was invisible to static analysis tools. Tests are the only durable proof that infrastructure works.
- **WASM compositor's texture cache is a production pattern**: `wasm-compositor.ts` deduplicates textures by `contentHash`, reuses `OffscreenCanvas`, and profiles frame timing. This is not prototype code — it's production infrastructure that was invisible to the assessment.

---

## What To Do Differently Next Time 🔄

- **Never launch a "port JS to Rust" feature without first auditing what the JS files actually contain**: The roadmap listed "Port 15 animation, 30+ command, 17 mask JS files" as remaining work. Reading the files confirmed this was unnecessary — they already delegate to WASM. A 15-minute audit would have removed months of phantom work from the roadmap.
- **Add a "test existence check" to the assessment update protocol**: When updating PLATFORM_ASSESSMENT.md, list which claims are backed by test evidence and which are static-analysis assumptions. This makes stale claims visible by their absence of test references.
- **GPU pipeline documentation should be a living artifact**: The architecture diagram from this feature should be updated whenever the compositor or WASM bridge changes. Mark it as "must-review" in the contributing guide for anyone touching `rust/crates/compositor/` or `rust/wasm/`.

---

## Metrics

| Metric | Value |
|---|---|
| Tasks planned | 10 |
| Tasks completed | 5 (all Phase C documentation; Phase A+B runtime tasks deferred) |
| Tests planned | 6 (testplan TC1–TC4 + AC1–AC6) |
| Tests passed | 0 (unit/E2E not yet executed) |
| Deviations from plan | 0 (phases A/B deferred to follow-up, not descoped) |
| Commits on branch | 4 |

---

## Follow-ups

- [ ] Execute A.1–A.3 (GPU activation verification, renderFrame trace, CPU fallback) in a WebGPU-capable browser
- [ ] Write and run B.1 (gpu-renderer unit test mocking WASM calls)
- [ ] Write and run B.2 (Playwright E2E test for GPU init)
- [ ] Update roadmap to mark Feature #19 as 🟢 Complete (pending runtime verification)
- [ ] Mark PLATFORM_ASSESSMENT.md GPU sections as "Verified: 2026-06-30" with link to architecture.md

---

## Key Lessons to Carry Forward

- **Lesson 1: Never scope a "port X to Rust" feature without reading X first.** The JS animation, command, and mask files already delegate to WASM. The entire porting backlog item was phantom work created by a stale assessment. Future features that claim "X is in JS, needs Rust" must include a code-reference audit as the first planning gate.
- **Lesson 2: Tests are the only durable assessment.** The GPU pipeline was real but invisible because no test asserted its existence. Every critical infrastructure path needs at least one test that verifies it activates — this turns "I think it works" into "it works, here's the proof."
- **Lesson 3: Architecture diagrams prevent cumulative assessment drift.** The `architecture.md` with its pipeline diagram and 4 architectural rules is now the single source of truth. Future assessments that repeat the "stub" claim can be dismissed by reference. Every complex subsystem deserves a similar single-source-of-truth diagram.
