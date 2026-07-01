# Analytics Service

**High-velocity data ingestion and LTV calculation engine.**

## Port

`8006`

## Framework

Node.js (Bun) — Express 5 + KafkaJS

## Description

Ingests user action telemetry from the Lazynext frontend and native apps. Accepts events via `POST /api/v1/events` (userId, eventType, metadata, sessionId) and buffers them in-memory with automatic Kafka production when brokers are configured. Computes aggregated metrics via `GET /api/v1/metrics` and per-user Lifetime Value (LTV) via `GET /api/v1/ltv/:userId`. Falls back to in-memory circular buffer (10k events) when Kafka/ClickHouse are unavailable. Tracks active user sessions for engagement analytics.

Event types: `page_view`, `timeline_edit`, `export_started`, `export_completed`, `ai_prompt`, `collaboration_join`, `payment_initiated`, `payment_completed`, etc.

## How to Run

```bash
bun run src/index.ts
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8006` | HTTP listen port |
| `KAFKA_BROKERS` | — | Comma-separated Kafka broker addresses |
| `CLICKHOUSE_URL` | — | ClickHouse HTTP endpoint for OLAP queries |

## Dependencies

- **Kafka** — Event streaming pipeline (optional; degrades to in-memory buffer)
- **ClickHouse** — OLAP analytics database (optional; enriches metrics queries)
