# API Gateway — Axum REST Server

REST API gateway providing JWT-authenticated access to the Lazynext platform. Port 8005.

## Features

- **Auth**: JWT (HS256) via better-auth, RBAC (Viewer/Editor/Admin)
- **Database**: PostgreSQL via sqlx with Drizzle-compatible schema
- **Payments**: Stripe webhooks with HMAC-SHA256 signature verification
- **AI**: `/api/v1/autonomous_edit`, `/api/v1/ai/generate`, `/api/v1/ai/tts`
- **Media**: Multipart upload, Azure Blob SAS URLs, chunked stream ingest
- **WebSocket**: CRDT sync via Redis pub/sub rooms
- **Security**: CSRF, rate limiting, OpenAPI/Swagger UI
- **Observability**: OpenTelemetry OTLP tracing

## Usage

```bash
cargo run -p lazynext_api_gateway
# Server starts on port 8005
# Swagger UI: http://localhost:8005/swagger-ui
```
