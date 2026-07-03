# 🧭 Feature Motto: AI-Driven Editing

> **Feature**: `18` — End-to-End Lazynext AI Agent Pipeline
> **Applies during**: Stage 5 (Build)

## DO ✅
- Verify before wiring — read existing microservice routes and CRDT schemas before adding code
- Every tool fix must be paired with a test case from testplan.md
- All CRDT patches must match the Rust engine's `applyOperation` expected schema
- Failures must be visible — errors propagate through SSE to the AI chat UI
- Graceful degradation: when microservices are down, tools return structured errors, never silent no-ops

## DON'T ❌
- Do NOT add new tools to the orchestrator's system prompt without a working case handler in `executeToolCall()`
- Do NOT ship CRDT patches whose paths haven't been validated against the engine schema
- Do NOT refactor the orchestrator's decomposition logic — this feature is about tool execution, not prompt engineering
- Do NOT touch desktop/mobile AI chat surfaces (out of scope)
- Do NOT implement new AI capabilities (voice cloning, NeRF, particles); fix what's advertised

## If stuck
- If a microservice endpoint doesn't exist, remove the tool from the prompt (don't add untested endpoints)
- If the CRDT engine rejects patches with undocumented validation, log the rejection with the exact error and patch — never silently discard
