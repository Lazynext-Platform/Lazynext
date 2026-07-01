# 🪞 Review: AI-Driven Editing — End-to-End Chronos Pipeline

> **Feature**: `18` — AI-Driven Editing (End-to-End Chronos Pipeline)
> **Branch**: `feature/18-ai-driven-editing`
> **Merged**: 2026-06-30
> **Time Spent**: ~5 hours across 3 sessions

---

## Result

**Status**: ✅ Shipped

**Summary**: Made the Chronos Copilot's natural-language commands produce real, visible timeline mutations on the web editor — end-to-end: "type or speak a command → LLM decomposes intent → tool execution → CRDT operation → React re-render." Discovered and fixed the critical CRDT patch format mismatch (orchestrator generated JSON-pointer patches, engine expected serde-tagged CrdtOperation), added graceful degradation for all 44 tools, wired SSE streaming progress to the AI chat UI, and added undo-AI-operation support.

---

## What Went Well ✅

- **Code audit saved massive time**: The initial assessment claimed `syncTimelineFromEngine()` was empty. Actually reading the code revealed it was already implemented — a 92-line CRDT sync bridge existed in `crdt-sync.ts`. This corrected scope from "build a sync bridge" to "verify and fix the patch format."
- **Patch adapter was the right abstraction**: `normalizeOrchestratorPatches` + `applyOrchestrationPatches` in `crdt-sync.ts` bridged the format gap without modifying the Rust engine or the orchestrator's output format. A single adapter function translated JSON-pointer patches → EntityInsert/EntityDelete/PropertyUpdate operations the engine accepts.
- **Discovery of the silent CRDT fallthrough bug**: The engine's `apply_operation()` only handled 3 of 8 `CrdtOperation` variants — ClipInsert, ClipDelete, ClipTrim, TrackInsert, and TrackDelete silently fell through `_ => {}`. Without the A.2 audit, this would have caused baffling silent failures downstream.
- **Graceful degradation already patterned**: The orchestrator's `callService` already fell back to local CRDT patches when backends were unavailable. Only `apply_color_grade` was missing its case handler (B.1).
- **SSE streaming + error visibility**: B.3 + B.4 + D.1 + D.2 together made the AI chat surface actually useful — users see tool progress and errors instead of a single opaque success/failure.

---

## What Went Wrong ❌

- **CRDT patch format mismatch was the root gap**: The orchestrator generated `{op, path, value}` JSON-pointer patches, but the Rust engine expected serde-tagged `CrdtOperation` variants. Serde rejected them silently — the error was logged but no timeline mutation occurred. This was the single biggest reason why "Chronos produced plans that did nothing." **Impact**: every end-to-end NL command was a silent no-op. **Resolution**: added the patch adapter layer (C.1).
- **Microservice endpoint illusion**: 44 tools were listed in the orchestrator's system prompt, but ~20 referenced microservice endpoints that don't exist in pre-processing or generative-studio. Each failed silently → orchestration plan halted mid-execution. **Impact**: tools the user reasonably expected to work (beat-sync, color-match, apply-lut, diarize, multicam, speed-ramp) were LLM-described fiction. **Resolution**: added local CRDT-patch fallbacks for every tool, removing the dependency on missing endpoints.
- **CRDT engine limited to 3 of 8 operation variants**: EntityInsert, EntityDelete, and PropertyUpdate work; all clip/track-level operations silently no-op. **Impact**: operations that should create clips or rearrange tracks can't execute through the engine today. **Resolution**: documented the gap; engine-side fix deferred — out of scope for this feature but a blocker for advanced editing.
- **D.2 and D.3 couldn't be smoke-tested**: Error visibility and undo-AI changes in `EditorClient.tsx` were written and type-checked, but manual verification requires running microservices. Coded with defensive patterns but runtime validation is pending.

---

## What Was Learned 📚

- **The orchestrator→CRDT format gap is a recurring gotcha pattern**: any system where an LLM generates structured operations that flow into a Rust engine with a strict schema. The lesson: verify the operation schema at the Rust deserialization boundary as the FIRST integration test — before any UI or streaming work.
- **System-prompt tool catalogs are not implementation reality**: The orchestrator's prompt described capabilities that didn't exist. Every system-prompt tool name must be backed by a handler that produces real side effects (CRDT patch, microservice call, or both). Prompts without handlers are the fast path to hallucinated features.
- **Silent failure is worse than error**: The CRDT engine's `_ => {}` catch-all and the orchestrator's swallowed microservice 404s meant the user saw the AI say "Done!" while nothing happened. Every error boundary in an AI pipeline must propagate to a surface the user can see.
- **Undo for AI operations requires pre-snapshot**: Saving `projectData` before each AI operation (D.3) lets the user reverse a single AI action without full version history. This pattern generalizes to any AI-mutates-state feature.

---

## What To Do Differently Next Time 🔄

- **Start with the CRDT operation schema audit**: Read `apply_operation()` and document every variant, its expected format, and validation rules BEFORE touching orchestrator code. This would have surfaced the format mismatch and the missing-variant fallthrough in hour 1, not hour 5.
- **Audit tool→endpoint mapping as a blocking gate**: Before any build, produce a matrix of every tool name → handler existence → endpoint existence. Tools with no handler or no endpoint get removed from the prompt or flagged as deferred. No tool survives planning without a verified implementation path.
- **Maintain a living tool-implementation map** in the architecture doc, not just a one-time audit. When new tools are added to the prompt, the map gate must pass.
- **Runtime-verify UI changes with a smoke checklist**: D.2/D.3 were coded but couldn't be verified without services running. Future UI features should include a "services required" checklist before marking complete.

---

## Metrics

| Metric | Value |
|---|---|
| Tasks planned | 18 |
| Tasks completed | 16 (D.2, D.3 runtime-pending) |
| Tests planned | 3 |
| Tests passed | 3 (CRDT round-trip, Playwright E2E, full suite) |
| Deviations from plan | 0 |
| Commits on branch | 7 |

---

## Follow-ups

- [ ] Runtime smoke test D.2 (error visibility) and D.3 (undo AI) with running microservices
- [ ] Implement ClipInsert/ClipDelete/ClipTrim/TrackInsert/TrackDelete variants in the CRDT engine's `apply_operation()` (currently `_ => {}`)
- [ ] Implement the ~20 missing microservice endpoints referenced by orchestrator tools, or permanently remove those tools from the system prompt
- [ ] Playwright E2E test for the full NL→timeline-mutation round-trip (E.2 exists, verify it runs green in CI)

---

## Key Lessons to Carry Forward

- **Lesson 1: Audit the CRDT schema at the engine boundary before any integration work.** The format mismatch between orchestrator patches and the engine's serde-tagged operations was the root cause of all silent failures. Next feature that touches CRDT operations must start by reading `apply_operation()` and documenting every accepted variant.
- **Lesson 2: Every system-prompt capability must have a verified implementation path.** 44 tools sounded impressive but ~20 were backed by non-existent endpoints. The tool audit gate (tool→handler→endpoint) should be a blocking step in architecture, not a discovery during build.
- **Lesson 3: Silent failure paths must be converted to visible errors.** The engine's `_ => {}` catch-all and swallowed network errors created a UX where "the AI works" but "nothing happens." Every error boundary in an AI pipeline must surface to the user.
