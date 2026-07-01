# 💬 Discussion: End-to-End Launch Readiness — All 7 Formats Verified Working

> **Feature**: `36` — E2E Launch Readiness
> **Status**: 🟡 IN PROGRESS (Stage 1 — Discuss)
> **Branch**: `feature/36-e2e-launch-readiness` (create after approval)
> **Depends On**: #35 (Platform Finalization)
> **Date Started**: 2026-07-01
> **Date Completed**: —

---

## Summary

The platform is **~97–99% code-complete** (independently verified: 0 todos in our Rust,
490 tests, compiled binaries, built WASM, prior Azure deploy). The remaining gap to a
**completely working** product across all 7 formats is **operational verification and
hardening of real data paths** — not new architecture.

This feature closes that gap: run everything live, fix what actually breaks, kill the
last cosmetic/fake paths, and prove the core promise — **"type or speak → platform
edits the video for you"** — end to end on a real clip in every format.

---

## Why This Feature (not "build from scratch")

The owner's framing assumed the repo was a leaked Claude Code source to redesign from.
It is not — it is Lazynext itself, already built by many prior sessions. Therefore the
highest-leverage work is **verify-and-finish**, not rebuild. Rebuilding would discard
~35 shipped features and 490 tests.

---

## Lessons from Previous Features

- **From #34/#35**: "write lifecycle docs, then verify against reality" caught
  assessment errors before. We will re-verify every claim with a live run, not a grep.
- **From #18**: The Chronos NL→CRDT pipeline was declared done; the *async job* path
  still returns a fake CDN URL (`autonomous.rs:68`). Verification must exercise the
  async path, not just the sync one.

---

## Functional Requirements

### F1 — Verify each format runs (Phase 0)
For each of Web, Desktop, Mobile, Extension, CLI, Gateway, MCP: launch it locally and
execute one real user action. Capture concrete pass/fail per format.

### F2 — Kill the known cosmetic/fake paths
- `autonomous.rs:68 check_job_status` → return the **real rendered output URL/blob**.
- `neural_engine/src/lib.rs:219–224` → replace "dummy detection" with real SCRFD inference
  (or document as a graceful-degradation fallback per project policy).
- `autonomous.rs:56 process_intent` async wrapper → delegate to the real LLM path.

### F3 — Prove the core value loop end to end (Phase 1)
A single natural-language sentence (and one spoken phrase on mobile/web) must:
1. be parsed to an intent,
2. mutate the CRDT timeline,
3. render via the GPU compositor,
4. export a valid MP4 (ffprobe-verified).

Target: produce a 60-second rough cut from one sentence.

### F4 — Per-format launch readiness (Phase 2)
Each format reaches "a real user can use it": signed desktop build, TestFlight/internal
Android, Chrome Web Store listing, published CLI binary, public gateway URL + Swagger,
MCP registry entry.

### F5 — Operational (Phase 3)
Monitoring green, alerts routed, on-call runbook, backups, secret rotation, load test.

---

## Non-Goals (this feature)
- New editing features (3D tracking, social publishing OAuth) — still out of scope per
  `project-context.md`.
- Re-architecture. "Rust owns logic; apps are shells" stays.

---

## Open Questions for the Owner
1. Which **LLM provider/key** should I wire for the AI editing smoke test
   (OpenAI / Anthropic / Gemini / local Ollama)? AI features gracefully degrade without
   one, but the core-promise demo needs a real key.
2. Is **Azure** the target launch cloud (infra already targets it), or local-first?
3. Priority order across the 7 formats if time-boxed?

---

## Next Stage
→ Stage 2 (Design): once the owner confirms scope + answers above, write
`architecture.md` (per-format verification matrix + fix plan), then `tasks.md` +
`testplan.md`, then **Stage 4 human approval** before any build.
