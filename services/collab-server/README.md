# Collab Server

**Real-time CRDT synchronization and WebRTC signaling server.**

## Port

`8004`

## Framework

Rust — Axum 0.8 + Tokio + WebSocket + PostgreSQL (sqlx)

## Description

Provides real-time multi-user collaboration for the Lazynext timeline. Clients connect via JWT-authenticated WebSocket and join project-scoped rooms. CRDT deltas are broadcast to all peers in a room for conflict-free state synchronization. Also relays WebRTC offer/answer/SDP messages for P2P media streaming between collaborators.

State is stored in-memory via DashMap (with PostgreSQL-backed persistence using `collab_states` table). Supports OpenTelemetry tracing export via OTLP.

## How to Run

```bash
cargo run
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8004` | HTTP/WS listen port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/lazynext` | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for JWT token verification |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OpenTelemetry OTLP collector endpoint |

## Dependencies

- **PostgreSQL** — Persistent CRDT state storage
- **OpenTelemetry Collector** (optional) — Trace/metric export
