# Packages — Shared Libraries

Shared TypeScript and Python packages used across apps and services.

| Package | Language | Purpose |
|---------|----------|---------|
| `api-client/` | TypeScript | Type-safe REST client for the API Gateway with auth middleware |
| `agent-sdk/` | TypeScript | SDK for building AI agents that control the NLE via natural language |
| `agent-sdk-python/` | Python | Python equivalent of the agent SDK (FastAPI compatibile) |
| `auth-python/` | Python | Shared JWT auth module for Lazynext Python microservices |

## Usage

### TypeScript
```json
{
  "dependencies": {
    "@lazynext/api-client": "workspace:*",
    "@lazynext/agent-sdk": "workspace:*"
  }
}
```

### Python
```bash
pip install packages/agent-sdk-python
pip install packages/auth-python
```
