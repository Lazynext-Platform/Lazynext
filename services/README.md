# Services — Backend Microservices

Async offload services for AI inference, rendering, collaboration, and analytics.

| Service | Language | Port | Purpose |
|---------|----------|------|---------|
| `ai-agents/` | TypeScript (Bun) | 8002 | Chronos Copilot orchestrator + CRDT sync |
| `render-service/` | TypeScript (Bun) | 8003 | FFmpeg render farm |
| `collab-server/` | Rust | 8004 | CRDT WebSocket sync + WebRTC signaling |
| `pre-processing/` | Python | 8000 | Whisper, SAM2, NeRF, scene detection |
| `generative-studio/` | Python | 8001 | AI video gen, dubbing, stem splitting |
| `analytics-service/` | TypeScript (Bun) | 8006 | Telemetry ingestion + LTV calculation |
| `mcp-server/` | TypeScript (Bun) | stdio | MCP protocol server (47 tools) |

## Graceful Degradation

All services fall back gracefully when API keys or external dependencies are unavailable. No mock data in production paths.
