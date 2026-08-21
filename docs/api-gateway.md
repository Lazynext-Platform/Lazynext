# Lazynext API Gateway

The API Gateway is the **central API layer** that other applications, agents,
services, and integrations use to talk to Lazynext. It exposes a versioned,
API-key-authenticated REST surface at `/api/v1/*` alongside the existing
editor (loopback) and MCP (agent protocol) surfaces.

| Surface | Audience | Auth |
|---|---|---|
| Editor / project store | The local browser editor | Loopback + same-origin Origin |
| MCP (`/api/external-mcp/mcp`) | AI agents (Claude Code, Codex, …) | Bearer MCP token |
| **API Gateway (`/api/v1/*`)** | **CLI, mobile app, browser extension, third-party services** | **Bearer API key** |

## Enable

Set `LAZYNEXT_API_KEY` in the server's `.env` (or via **Settings → API Keys**):

```bash
LAZYNEXT_API_KEY=your-secret-key
# Optional:
LAZYNEXT_API_RATE_LIMIT=120/min
LAZYNEXT_API_CORS_ORIGIN=*
```

When unset, the gateway is disabled and every `/api/v1/*` route (except
`/health`) returns `404 gateway_disabled`.

## Authentication

Send the key with every request:

```
Authorization: Bearer your-secret-key
# or
x-lazynext-api-key: your-secret-key
```

Auth is header-based (not cookies), so CORS `*` is safe — a cross-origin page
cannot call an endpoint without the key.

## Rate limiting

A token bucket per API key (default **120 req/min**). Configure with
`LAZYNEXT_API_RATE_LIMIT`: `"120/min"`, `"10/s"`, `"300/hour"`, or a bare number
(per minute). `429` responses include `Retry-After`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check (public, no auth) |
| GET | `/api/v1/status` | Server status + capabilities |
| GET | `/api/v1/openapi.json` | OpenAPI 3.1 document (public) |
| GET | `/api/v1/docs` | Interactive Swagger UI (public) |
| GET | `/api/v1/projects` | List projects (`?includeDeleted=true`) |
| POST | `/api/v1/projects` | Create a project (body: `name`, `description`, `fps`, `compositionWidth`, `compositionHeight`) |
| GET | `/api/v1/projects/{id}` | Get a project document |
| DELETE | `/api/v1/projects/{id}` | Delete a project (`?purge=true` to remove the document) |
| GET | `/api/v1/projects/{id}/media` | List media available to a project |
| GET | `/api/v1/media` | List all uploaded media |
| POST | `/api/v1/media` | Upload media (raw body, `Content-Type: <mime>`, `?name=<filename>`) |
| GET | `/api/v1/media/{name}` | Download a media file |
| GET | `/api/v1/search` | Full-text search (`?q=&project=&limit=`) |
| POST | `/api/v1/search/hybrid` | Hybrid text + vector search (body: `query`, `queryVector?`, `projectId?`, `limit?`) |
| GET | `/api/v1/agent/tools` | List MCP agent tools |
| GET | `/api/v1/agent/mcp` | MCP endpoint discovery |

## Examples

```bash
# Status
curl -H "Authorization: Bearer $LAZYNEXT_API_KEY" http://localhost:5199/api/v1/status

# Create a project
curl -X POST -H "Authorization: Bearer $LAZYNEXT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}' http://localhost:5199/api/v1/projects

# Upload media
curl -X POST -H "Authorization: Bearer $LAZYNEXT_API_KEY" \
  -H "Content-Type: video/mp4" --data-binary @clip.mp4 \
  "http://localhost:5199/api/v1/media?name=clip.mp4"
```

## Consumers

- **CLI** (`cli/`) — `lazynext` command, see [cli/README.md](../cli/README.md).
- **Browser Extension** (`extension/`) — see [extension/README.md](../extension/README.md).
- **Mobile App** (`mobile/`) — see [mobile/README.md](../mobile/README.md).

## Agent editing

The gateway exposes agent *discovery* (`/agent/tools`, `/agent/mcp`). For full
agent-driven editing (begin edit session, edit timeline, review), use the MCP
endpoint directly — the gateway intentionally does not reimplement the MCP
protocol, it points clients to it.

## Security model

The gateway reuses the same importable store/media/search functions as the
editor and MCP surface, so all three stay in sync. Authenticated gateway writes
are allowed through the global CSRF request-shape gate
(`server/plugins/request-shape-gate.ts`) via `apiGatewayAuthorized`, so external
clients (no same-origin Origin) can perform writes safely.
