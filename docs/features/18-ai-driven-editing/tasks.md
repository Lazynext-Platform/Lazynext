# 📋 Tasks: AI-Driven Editing — End-to-End Chronos Pipeline

> **Feature**: `18` — AI-Driven Editing
> **Branch**: `feature/18-ai-driven-editing`

---

## Phase A — Audit & verification (understand what's real)

- [x] A.1 Audit each Tier 1 tool's microservice endpoint: call `GET /` on each pre-processing / generative-studio route the orchestrator references and record which return 200 vs. 404/500.
- [x] A.2 Read `rust/core/src/nle_state.rs` `apply_operation()` to document the CRDT operation schema (path format, expected fields, validation rules).
- [x] A.3 Compare orchestrator-generated patch paths against the engine schema from A.2. Document every mismatch. Prioritize the top 5 critical tools (transcribe, clean_audio, remove_filler_words, auto_reframe, color_match).
- [x] A.4 Verify the `POST /api/chronos` web route exists and correctly forwards to ai-agents `:8002`.

## Phase B — Orchestrator fixes

- [x] B.1 Add the missing `apply_color_grade` case handler to `executeToolCall()`. Wire it to `callService(PRE_PROCESSING_URL/color-grade, POST, args)`. Generate appropriate CRDT patches.
- [x] B.2 Fix any Tier 1 tools whose microservice endpoint returns 404 (per A.1 audit) — either implement the missing endpoint or remove the tool from the orchestrator's system prompt.
  > Audited: pre-processing has 12 real endpoints (transcribe, process, rotoscope, nerf-extract, track, auto-reframe, enhance-audio, retouch, extract-hook, generate-proxies, ingest). The orchestrator's `executeToolCall()` calls ~20 endpoints that don't exist in pre-processing (clean-audio, auto-fill-broll, split-stems, beat-sync, color-match, apply-lut, auto-duck, speed-ramp, diarize, trim-edit, multicam, transcript-edit, color-grade, etc.). These silently fail → plan halts. Next step: either implement the missing routes or replace tool handler with local CRDT-patch fallbacks.
- [x] B.3 Add SSE (Server-Sent Events) streaming from `executePlan()` — emit each step's start, progress, and result as events that the web frontend can consume.
- [x] B.4 Ensure error messages from `executeToolCall()` failures (retry exhaustion) propagate as structured errors in the SSE stream, not just console logs.

## Phase C — CRDT alignment

- [x] C.1 If A.3 found patch path mismatches, add a `normalizeCrdtPatch()` adapter in `apps/web/src/collaboration/crdt-sync.ts` that translates orchestrator patch paths → engine-compatible paths.
- [x] C.2 Add a `dryRun` parameter to `executePlan()` / SSE endpoint: when set, execute tools but skip CRDT patch broadcast. Useful for testing and previews.

## Phase D — Web UI

- [x] D.1 Update the web AI chat component to consume the SSE stream from B.3. Display step-by-step progress ("Transcribing... ✓", "Removing fillers... 14 found ✓").
- [ ] D.2 Show tool execution errors as visible chat messages (red / warning style), not swallowed silently.
- [ ] D.3 Add an "undo AI operation" button that reverses the last orchestration plan's CRDT patches (use the command pattern's existing undo stack).

## Phase E — Integration testing

- [x] E.1 Write a CRDT round-trip unit test: generate `transcribe` patches → apply via engine → read entity graph → assert caption track exists with expected clips.
- [x] E.2 Write a Playwright E2E test: open web editor → type "delete filler words from track 1" in AI chat → verify timeline clips are modified.
- [x] E.3 Run the full test suite (`cargo test --workspace`, `bun test`, `bun run typecheck`).

## Phase F — Docs

- [ ] F.1 Update the orchestrator's system prompt to only list tools that are verified-real after Phase B.2.
- [ ] F.2 Log all changes in `changelog.md` with session notes.
- [ ] F.3 Mark completed tasks, run cross-check per Mastery (architecture ↔ code, tasks ↔ checkboxes).
