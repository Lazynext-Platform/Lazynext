# AI Agents

**Lazynext AI Agent Copilot — Natural language editing orchestration engine.**

## Port

`8002`

## Framework

Node.js (Bun) — Express 5 + Socket.IO + MCP SDK

## Description

Receives high-level natural language editing intents (e.g., "cut silence", "add b-roll of city skyline"), decomposes them into tool calls across the Lazynext microservices, executes each step, and broadcasts CRDT patches via WebSocket to connected timeline clients. Powered by Google Gemini with rule-based fallback. Exposes both REST (`POST /orchestrate`) and SSE streaming (`GET /orchestrate/stream`) endpoints.

Generative sub-routes (`POST /generative/broll`, `POST /generative/dub`) proxy to the generative-studio service.

## How to Run

```bash
bun run src/index.ts
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8002` | HTTP listen port |
| `GEMINI_API_KEY` | — | Google Gemini API key for LLM decomposition |
| `LLM_PROVIDER` | `rule-based` | LLM provider override |
| `PRE_PROCESSING_URL` | `http://localhost:8000` | Pre-processing service URL |
| `GENERATIVE_STUDIO_URL` | `http://localhost:8001` | Generative studio service URL |
| `RENDER_SERVICE_URL` | `http://localhost:8003` | Render service URL |

## Dependencies

- **pre-processing** (`:8000`) — Audio transcription, scene detection, rotoscoping
- **generative-studio** (`:8001`) — AI video/audio generation
- **render-service** (`:8003`) — FFMPEG render farm for export
