# Architecture Deep-Dive: System Data Flow

A cross-process map of how data moves through Lazynext — from a user action to
pixels on screen and bytes in an exported file. This ties together the
[CRDT model](architecture-crdt.md) and the [compositor pipeline](architecture-compositor.md).

---

## The golden rule

**Rust owns all business logic. Apps are dumb rendering shells.** Every arrow
below that touches editing logic passes through Rust — via WASM (web), UniFFI
(mobile), native calls (desktop), or REST (extension/integrations).

---

## Process topology

```
┌───────────────── Shells (presentation only) ─────────────────┐
│ Web (Next.js)   Desktop (GPUI)   Mobile (RN)   Extension (MV3)│
└───┬─────────────────┬───────────────┬──────────────┬─────────┘
    │ WASM            │ native         │ UniFFI        │ REST
    ▼                 ▼                ▼               ▼
┌───────────────── Rust core (single source of truth) ─────────┐
│ core (NLEState, CoreEngine, AI copilot, task queue)          │
│ crates: state(CRDT) · compositor(GPU) · effects · masks ·    │
│         audio · export · time · gpu · neural_engine          │
│ api-gateway(:8005) · mcp-server(stdio) · cli                 │
└───┬───────────────────────────────────────────────┬─────────┘
    │ HTTP / SSE / WS                                 │ SQL
    ▼                                                 ▼
┌───────────── Microservices (async offload) ──────┐  ┌──────────┐
│ pre-processing:8000  generative-studio:8001      │  │PostgreSQL│
│ ai-agents:8002       render-service:8003         │  │(Drizzle) │
│ collab-server:8004   analytics:8006  social:8007 │  └──────────┘
└───────────────────────────────────────────────────┘
```

---

## Flow 1 — Interactive edit (web)

```
User drags a clip
  → React handler (apps/web)
  → command dispatched (src/commands/*)
  → WASM engine builds a CrdtOperation and applies it locally (state crate)
  → syncTimelineFromEngine() hydrates React state from the WASM entity graph
  → scene-builder.ts compiles state into a FrameDescriptor
  → WASM renderFrame() composites to the canvas (compositor crate)
  → (if collaborating) operation is serialized and sent to peers
```

Latency-critical: steps stay in-process (JS ↔ WASM) except the final peer
broadcast, which is fire-and-forget.

## Flow 2 — Real-time collaboration

```
Peer A edit ──serialize──▶ ai-agents:8002 (Socket.IO)  ──▶ Peer B
                       └──▶ collab-server:8004 (raw WS)  ──▶ Peer B (native)
Peer B: apply_operation() → tombstone/vector-clock checks → converged state
```

See [architecture-crdt.md](architecture-crdt.md) for convergence guarantees.

## Flow 3 — AI Copilot (natural language → edits)

```
User prompt
  → ai-agents:8002 orchestrator (LLM: Gemini/Ollama)
  → structured tool calls → CrdtOperations
  → applied through the same state crate path as human edits
  → timeline updates + optional preview
Graceful degradation: with no API key, falls back to local processing.
```

## Flow 4 — Media pre-processing

```
Upload → pre-processing:8000
  → transcription (Whisper), rotoscoping (SAM2), motion tracking,
    proxy generation, auto-reframe
  → results referenced by media ID; heavy artifacts stored, IDs returned
```

## Flow 5 — Export / render

```
Export request
  → compositor renders each frame to an offscreen texture (render_frame_to_target)
  → frames piped to the export crate → FFmpeg filter graph (ffmpeg_filter)
  → encoded to MP4/H.265/ProRes/DCP/AAF/MOV/GIF
  → progress streamed via SSE (render-service:8003)
```

Because export reuses the preview compositor, output is WYSIWYG.

---

## Persistence

| Data | Store | Access |
|------|-------|--------|
| Projects, users, credits, subscriptions | PostgreSQL (Drizzle ORM) | api-gateway, web server actions |
| Local project cache / media | IndexedDB + OPFS | web app (`services/storage`) |
| Session snapshots | serde-serialized state | `core/session_portability.rs` |
| Analytics events | Kafka → (LTV engine) | analytics-service:8006 |

Schema: `apps/web/src/db/schema.ts`; migrations in `apps/web/src/drizzle/`.

---

## Boundary reference

| Boundary | Mechanism | Code |
|----------|-----------|------|
| Web ↔ Rust | wasm-bindgen | `rust/wasm/src/*` |
| Mobile ↔ Rust | UniFFI | `rust/core` + `apps/mobile/modules` |
| Desktop ↔ Rust | direct native calls | `apps/desktop/src/*` |
| Shell ↔ backend | REST + JWT (HS256) | `rust/api-gateway` |
| AI agent ↔ core | MCP (JSON-RPC/stdio) | `rust/mcp-server` |
| Service ↔ service | HTTP / SSE / WS | `services/*` |

---

## Where to look next

- Editing convergence → [architecture-crdt.md](architecture-crdt.md)
- Rendering → [architecture-compositor.md](architecture-compositor.md)
- Endpoints → [../api-reference.md](../api-reference.md)
- Crate-by-crate → [../developer-guide.md](../developer-guide.md#rust-crate-guide)
