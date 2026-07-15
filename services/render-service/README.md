# Render Service

**Headless FFMPEG render farm with job queue and social publishing.**

## Port

`8003`

## Framework

Node.js (Bun) — Express 5 + BullMQ + Redis (ioredis) + Local Filesystem

## Description

Renders Lazynext timeline exports to video files via FFMPEG. Supports two rendering modes:

- **Timeline mode** (`POST /api/v1/export`) — Accepts full timeline data, builds an FFMPEG filter graph with overlays and audio mixing, encodes to MP4/ProRes/DCP/AAF.
- **Frame-stream mode** (`POST /api/v1/export/:jobId/frames`) — Browser streams raw RGBA frames; the service assembles and encodes them.

Jobs are managed via BullMQ (backed by Redis). Progress is streamed via SSE (`GET /api/v1/jobs/:jobId/stream`). Rendered outputs are stored on the local filesystem and signed with a C2PA provenance manifest for content authenticity. A social publish endpoint (`POST /api/v1/publish`) pushes finished renders to platforms (TikTok, etc.).

## How to Run

```bash
bun run src/index.ts
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8003` | HTTP listen port |
| `UPSTASH_REDIS_REST_URL` | `redis://localhost:6379` | Redis URL for BullMQ |
| `OUTPUT_DIR` | `./outputs` | Local output directory for renders |
| `RENDER_TIMEOUT_MS` | `300000` | FFMPEG render timeout (ms) |
| `EXPORT_FRAME_STREAM_MAX_BYTES` | `67108864` | Max buffered frame bytes (64MB) |
| `STORAGE_PROVIDER` | — | Set to `local` for local filesystem storage |
| `MEDIA_BUCKET` | `media` | Local filesystem container directory |
| `BETTER_AUTH_SECRET` | `lazynext-dev` | Secret for C2PA manifest signing |
| `C2PA_SIGNING_CERT_ISSUER` | `Lazynext Development CA` | C2PA certificate issuer |

## Dependencies

- **Redis** — Job queue backend (BullMQ)
- **FFMPEG** — Must be installed and available on `$PATH`
- **Local Filesystem** — Output storage at `/opt/lazynext/media`
