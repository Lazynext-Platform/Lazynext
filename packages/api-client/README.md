# `@lazynext/api-client`

TypeScript SDK for the Lazynext API Gateway (port 8005). Provides a typed client with JWT authentication and built-in rate-limit handling.

## Install

```bash
bun add @lazynext/api-client
```

## Usage

```typescript
import { LazynextClient } from "@lazynext/api-client";

const client = new LazynextClient({
  baseUrl: "http://localhost:8005",
  token: "your-jwt-token",
  onTokenExpired: async () => refreshToken(),
});

// Health check
const { status } = await client.health.check();

// Execute an autonomous edit
await client.editor.autonomousEdit("cut silence and add music");

// Fetch timeline state
const timeline = await client.timeline.get();

// AI operations
await client.ai.generate("create a 30-second highlight reel");
await client.ai.tts("Welcome to my video", "voice-id");
await client.ai.ingest("https://example.com/video.mp4", "web");
```

## API Coverage

| Namespace | Endpoints |
|-----------|-----------|
| `health` | `GET /health` |
| `editor` | `POST /api/v1/autonomous_edit`, `POST /api/v1/render` |
| `timeline` | `GET /api/v1/timeline`, `POST /api/v1/timeline` |
| `projects` | `GET /api/v1/projects` |
| `user` | `GET /api/v1/user/profile`, `GET /api/v1/user/credits` |
| `ai` | `POST /api/v1/ai/generate`, `POST /api/v1/ai/tts`, `POST /api/v1/ai/ingest` |
| `integrations` | `POST /api/v1/user/integrations/connect` |
| `admin` | `GET /api/v1/admin/dashboard` |

## Features

- **JWT auto-refresh**: Calls `onTokenExpired` on 401, retries request with new token.
- **Rate limit handling**: On 429, reads `Retry-After` header and waits before retrying.
- **Full TypeScript types**: All request/response types defined in `src/types.ts`.
