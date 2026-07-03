# 💬 Discussion: AI-Driven Editing — End-to-End Lazynext AI Agent Pipeline

> **Feature**: `18` — AI-Driven Editing (End-to-End Lazynext AI Agent Pipeline)
> **Status**: 🔴 STAGE 1 — Discuss
> **Branch**: `feature/18-ai-driven-editing`
> **Depends On**: #01 (Rust Core), #02 (Web Shell), #10 (Rust Hardening), #15 (AI Real API)
> **Date Started**: 2026-06-30

## Summary

Make the Lazynext AI Agent Copilot's natural-language commands reliably produce real, visible timeline mutations on the web editor — end-to-end: "type or speak a command → LLM decomposes intent → tool execution → CRDT operation → React re-render." Verify every advertised editing feature (filler removal, transcript editing, auto-B-roll, smart reframe, color match, etc.) actually works rather than returning a plan that can't execute.

## Functional Requirements

- A user types or speaks a natural-language editing intent in the web editor's AI chat
- Lazynext AI Agent (ai-agents `:8002`) receives it, decomposes the intent into tool calls, routes to the appropriate LLM provider
- Tool calls execute against real microservices (pre-processing `:8000`, generative-studio `:8001`, etc.) or against the WASM CRDT engine directly
- The result produces genuine CRDT operations that mutate the timeline
- The web editor's React state re-renders from the WASM entity graph (already wired via `syncTimelineFromEngine`)
- Graceful degradation: when microservices or API keys are absent, fall back to local processing or a helpful error — never silently no-op
- Prioritised editing features verified working: transcript editing (delete filler words by editing text), silence removal, auto-B-roll, smart reframe, color match, auto-captions

## Current State (post-#09–#17 hardening)

### What already works

- **NL decomposition**: `services/ai-agents/src/orchestrator.ts` (1593 lines) decomposes natural-language prompts into structured orchestration plans with tool calls. Routes to OpenAI/Anthropic/Ollama automatically. Falls back to rule-based decomposition when LLMs are unavailable.
- **Tool catalog**: 50+ named editing operations are listed in the orchestrator's system prompt (transcribe, generate_broll, apply_color_grade, clean_audio, add_viral_captions, edit_via_transcript, remove_filler_words, diarize_speakers, auto_reframe, apply_color_match, 3D LUT, generate_proxies, apply_speed_ramp, perform_trim_edit, etc.).
- **MCP integration**: `services/ai-agents/src/mcp.ts` wraps Playwright, Firecrawl, and Context7 MCP clients — the AI agent can invoke external tools during decomposition.
- **Web editor AI chat surface**: wired to the real API endpoint (Feature #15).
- **CRDT sync bridge**: `apps/web/src/collaboration/crdt-sync.ts` (92 lines) is **already implemented** — `syncTimelineFromEngine()` reads the WASM entity graph, hydrates scenes, and updates React state via `EditorCore`. The earlier assessment claiming it was empty is outdated.
- **WebSocket CRDT sync**: `setupCrdtSync()` listens for remote deltas, applies them to the WASM engine, and triggers `syncTimelineFromEngine()`. `broadcastOperation()` sends local edits to peers.
- **Microservice wiring**: pre-processing, generative-studio, and render-service have real endpoints for core operations.

### What's missing / uncertain

- **Tool reality audit**: which of the 50+ orchestrator tools are backed by real implementations vs. being LLM-described tool names that map to empty or placeholder endpoints? This needs a per-tool audit against microservice routes + CRDT operations.
- **End-to-end wet-run**: has the full pipeline (type "delete filler words from track 1" → LLM decomposes → tool executes → timeline visibly changes) been tested end-to-end? No evidence of integration tests for this path.
- **Error visibility**: when a tool fails (e.g. microservice down, missing API key, invalid operation), does the user get a meaningful error in the AI chat, or does it silently no-op?
- **Streaming responses**: the web AI chat surface should show tool execution progress (e.g. "Transcribing track 1... ✓ / Removing 14 filler words... ✓") rather than a single final success/failure.
- **Graceful degradation per tool**: some tools (like `generate_broll`, `style_transfer`) depend on rate-limited/paid external APIs. Each must gracefully fall back when keys are absent — not silently fail.
- **Lazynext AI Agent → CRDT operation generation**: the orchestrator produces `OrchestrationStep.crdt_patches` (arrays of `{op, path, value}`). But do these generated patches actually match the Rust CRDT engine's expected operation schema? Needs verification.
- **Web AI chat UX polish**: the chat component should display tool names + progress, let users undo/redo AI operations, and show a diff preview before committing large timeline changes.

## Knowledge Gaps → Research Needed (Stage 2 Architecture)

1. **Per-tool implementation status**: map every orchestrator tool name → microservice endpoint or CRDT operation. Identify which are real, which are LLM descriptions of non-existent endpoints, and which degrade gracefully.
2. **CRDT patch format alignment**: the orchestrator generates `crdt_patches` — verify these match the WASM engine's `applyOperation()` schema. One misalignment and the entire pipeline silently does nothing.
3. **Integration test scaffolding**: what exists for testing a full NL → timeline mutation round-trip? (Likely zero.)
4. **Web AI chat component**: review the current chat UI to understand where results are displayed and how errors surface.
5. **Performance profile**: what's the latency from prompt submission → visible timeline change? Does LLM decomposition add unacceptable delay for real-time-feeling editing?

## Proposed Approach

1. **Tool reality audit** (highest priority): produce a map of orchestrator tool → implementation status (real / stub / N/A). Document in `architecture.md`.
2. **Wire missing critical tools**: transcribe + filler removal + silence removal + auto-reframe + color match — these are the five that make the "AI-native" pitch credible. Each must produce real CRDT timeline mutations.
3. **End-to-end integration test**: `type "remove silence from all tracks" → verify tracks shrink`. Add as a Playwright E2E test (feature #15 wired the MCP protocol tests; extend to the web surface).
4. **Streaming progress + error visibility**: the AI chat UI should stream tool progress, not a one-shot result.
5. **Graceful degradation**: every tool that calls an external API must have a documented fallback path.

## Non-goals (for this feature)

- Desktop/mobile AI chat surfaces (defer to #07 / #08 depth work)
- New AI capabilities (voice cloning, NeRF, particle systems) — this feature is about making the *existing* advertised features actually work
- LLM provider changes (OpenAI/Anthropic/Gemini/Ollama switching is already wired)

## Discussion Complete ✅

**Status**: Requirements and current state documented; knowledge gaps identified for Stage 2.

**Completed**: 2026-06-30
**Next**: Create `architecture.md` (Stage 2 — Design).
