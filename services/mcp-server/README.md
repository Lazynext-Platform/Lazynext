# MCP Server

**Model Context Protocol server for Lazynext — exposes editing tools to AI assistants.**

## Port

None — communicates over stdio via MCP protocol.

## Framework

Node.js (Bun) — MCP SDK 1.x + StdioServerTransport

## Description

Implements the Model Context Protocol to expose Lazynext editing capabilities as tools that AI coding assistants (Claude Desktop, Cursor, etc.) can invoke. Currently exposes a single tool:

- `autonomous_edit` — Accepts a natural language prompt and forwards it to the Lazynext API Gateway (`POST /v1/execute`), returning a job ID and status.

Runs as a stdio-based server, meant to be configured as an MCP tool provider in AI assistant configuration files.

## How to Run

```bash
bun run src/index.ts
```

For distribution (compiled):

```bash
tsc && node dist/index.js
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_GATEWAY_URL` | `http://localhost:8005` | Lazynext API Gateway URL |

## Dependencies

- **api-gateway** (`:8005`) — REST gateway that handles autonomous edit execution
