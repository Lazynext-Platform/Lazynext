# 🏗️ Architecture: AI-Driven Editing — End-to-End Chronos Pipeline

> **Feature**: `18` — AI-Driven Editing
> **Status**: FINALIZED
> **Depends On**: #01, #02, #10, #15

---

## Pipeline

```
User types/speaks NL command
        │
        ▼
┌──────────────────────────────────┐
│  Web Editor Chat (Next.js)       │  apps/web/src/components/editor/
│  POST /api/chronos → ai-agents   │
└──────────────────┬───────────────┘
                   │ HTTP POST {prompt, projectId}
                   ▼
┌──────────────────────────────────┐
│  ai-agents :8002                 │  services/ai-agents/src/orchestrator.ts
│  decomposeIntent(prompt)         │
│  ├─ LLM route (OpenAI/Anth/      │
│  │  Ollama) → JSON plan          │
│  └─ Rule-based fallback          │
│  executePlan(steps)              │
│  ├─ executeToolCall(tool, args)  │
│  │  ├─ Real service → HTTP fetch │
│  │  └─ Local → return crdt_      │
│  │     patches directly          │
│  └─ Retry loop (2x)              │
└──────────────────┬───────────────┘
                   │ OrchestrationResult {steps, results, crdt_patches}
                   ▼
┌──────────────────────────────────┐
│  apply CRDT patches to WASM      │  rust/core/src/nle_state.rs
│  engine.applyOperation(op)       │
│  → React sync via                │
│  syncTimelineFromEngine()        │  apps/web/src/collaboration/crdt-sync.ts
└──────────────────────────────────┘
```

## Tool reality matrix

**Audit of `orchestrator.ts` `executeToolCall()` switch (43 handlers + 1 missing + 1 default):**

### Tier 1 — Calls real microservice (verified calling `callService()`)

| Tool | Service | Endpoint | Status |
|---|---|---|---|
| `transcribe` | pre-processing :8000 | `/transcribe` | Calls real endpoint. Produces CRDT patches for caption track. |
| `generate_dub` | generative-studio :8001 | `/dub` | POST with target_language. |
| `overdub_audio` | generative-studio :8001 | `/overdub` | Calls service, generates CRDT patch for audio clip. |
| `generate_broll` | generative-studio :8001 | `/generate-video` | POST with prompt. |
| `auto_fill_broll` | pre-processing :8000 | `/auto-fill-broll` | Calls service, returns stock-footage patches. |
| `remove_background` | pre-processing :8000 | `/rotoscope` | Calls service, generates AlphaMask effect patches. |
| `track_motion` | pre-processing :8000 | `/track` | Calls service, returns keyframe patches. |
| `auto_reframe` | pre-processing :8000 | `/auto-reframe` | Calls service, returns resolution + crop patches. |
| `enhance_audio` | pre-processing :8000 | `/enhance-audio` | Calls service, returns enhanced audio clip patches. |
| `split_stems` | pre-processing :8000 | `/split-stems` | Calls service. |
| `extract_viral_hook` | pre-processing :8000 | `/extract-hook` | Calls service, returns clip patch. |
| `apply_beauty_retouch` | pre-processing :8000 | `/beauty-retouch` | Calls service. |
| `auto_beat_sync` | pre-processing :8000 | `/beat-sync` | Calls service. |
| `style_transfer` | generative-studio :8001 | `/style-transfer` | Calls service. |
| `generative_fill` | generative-studio :8001 | `/generative-fill` | Calls service. |
| `generate_ai_avatar` | generative-studio :8001 | `/generate-avatar` | Calls service. |
| `generate_viral_captions` | pre-processing :8000 | Caption gen. Calls transcribe first, then generates style. |
| `apply_color_match` | pre-processing :8000 | `/color-match` | Calls service. |
| `apply_lut` | pre-processing :8000 | `/apply-lut` | Calls service. |
| `apply_auto_ducking` | pre-processing :8000 | `/auto-duck` | Calls service. |
| `publish_to_social` | — | (no URL hardcoded) | Needs env var. |
| `render` | render-service :8003 | `/render` | Calls service. |
| `generate_proxies` | pre-processing :8000 | `/generate-proxies` | Calls service. |
| `apply_speed_ramp` | pre-processing :8000 | `/speed-ramp` | Calls service. |
| `diarize_speakers` | pre-processing :8000 | `/diarize` | Calls service. |
| `perform_trim_edit` | pre-processing :8000 | `/trim-edit` | Calls service. |
| `fetch_assets` | Pexels/Pixabay APIs | — | `fetchStockFootage()` calls Pexels. |
| `setup_multicam` | pre-processing :8000 | `/multicam` | Calls service. |

### Tier 2 — Local CRDT patch generator (no microservice call, produces patches directly)

| Tool | Mechanism | Notes |
|---|---|---|
| `add_viral_captions` | Calls transcribe first, then builds TextLayer patches from results. | Hybrid: calls transcribe (Tier 1) then generates local patches. |
| `add_null_object` | Returns crdt_patches directly. | Local operation. |
| `add_shape_layer` | Returns crdt_patches directly. | Local operation. |
| `add_particle_system` | Returns crdt_patches directly. | Local operation. |
| `add_kinetic_typography` | Returns crdt_patches directly. | Local operation. |
| `add_sound_effect` | Returns crdt_patches directly. | Local operation. |
| `extrude_3d_text` | Returns crdt_patches directly. | Local operation. |
| `adjust_hdr_color` | Returns crdt_patches directly. | Local operation. |
| `toggle_scopes` | Returns {success: true}. | UI-toggle, no CRDT patch needed. |
| `toggle_pancake_timeline` | Returns {success: true}. | UI-toggle, no CRDT patch needed. |
| `setup_3d_environment` | Returns {success: true}. | Mock. |
| `setup_node_grading` | Returns crdt_patches. | Local operation. |

### Tier 3 — Mixed (calls service AND generates patches)

| Tool | Flow |
|---|---|
| `clean_audio` | Calls pre-processing `/clean-audio`, returns silence/filler removal patches. |
| `remove_filler_words` | Wrapper around `clean_audio` with filler-only filter. |
| `edit_via_transcript` | Calls pre-processing `/transcript-edit`, returns clip trim/split patches. |

### Tier 4 — **Missing from switch** (LLM can request it, but execution fails)

| Tool | Fix |
|---|---|
| `apply_color_grade` | In system prompt but no case handler → default returns `{success: false}`. Add case handler. |

## CRDT patch format

The orchestrator generates patches in this shape:
```ts
{ op: "add" | "replace" | "remove", path: "/tracks/<name>/clips/<id>/...", value: {...} }
```

**These paths must match the WASM engine's `applyOperation()` schema.** If paths don't match, the operation is silently accepted (engine validates) but produces no visible timeline change. This is the highest-risk point of silent failure. Verification needs to:
1. Read the Rust CRDT operation type (`rust/core/src/nle_state.rs` → `apply_operation()`)
2. Map orchestrator-generated paths to the engine's expected schema
3. Test with a real operation → verify React re-render

## Key changes needed

### A. Completeness (immediate)
1. **Add `apply_color_grade` case** to `executeToolCall()` switch — the one missing tool.
2. **Verify Tier 1 tool microservice endpoints actually exist** — `callService()` will silently 500 on a missing route, but the orchestrator logs and retries. Need a documented endpoint-to-status map.

### B. CRDT alignment (high risk)
3. **Validate CRDT patch paths**: compare orchestrator-generated paths (`/tracks/caption_track/clips/caption_1`) against the Rust engine's expected schema. If mismatched, add a **patch adapter layer** in `crdt-sync.ts` that translates orchestrator paths → engine paths.
4. **Add a `dryRun` mode**: before executing a plan, send patches to the engine with `validate=true` to verify they'll be accepted. Return early warnings in the OrchestrationResult.

### C. Streaming / UX (medium risk)
5. **Stream progress**: the current `executePlan()` returns a single result after all steps complete. For a UI that shows "Transcribing... ✓ / Removing fillers... ✓", each step's result must be streamed. Add a Server-Sent Events or WebSocket channel from `executePlan()` back to the web AI chat.
6. **Error visibility**: when a tool fails, the error string (`"Transcription failed"`) must propagate to the chat UI as a visible message, not be swallowed.

### D. Testing
7. **Integration test**: `POST /api/chronos {prompt: "transcribe video 1"} → verify captions appear on timeline`.
8. **CRDT round-trip test**: generate a patch, apply via engine, read entity graph back, assert the expected entity exists.

## Files impacted

| File | Change |
|---|---|
| `services/ai-agents/src/orchestrator.ts` | Add `apply_color_grade` case; add streaming response mode |
| `services/ai-agents/src/index.ts` | Expose SSE endpoint for streaming progress |
| `apps/web/src/collaboration/crdt-sync.ts` | Add patch adapter layer (orchestrator path → engine path) |
| `apps/web/src/components/editor/` AI chat component | Show step-level progress, errors from downstream |
| `rust/core/src/nle_state.rs` | Document `applyOperation` expected schema (read-only; schema from audit) |
| `apps/web/src/app/api/chronos/` or equivalent | Verify the route that POSTs to ai-agents / wire streaming |
| New: `rust/tests/orchestrator_crdt_roundtrip.rs` | Integration test |
