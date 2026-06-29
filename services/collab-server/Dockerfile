# Lazynext Collab Server Dockerfile
#
# Standalone build of the native Rust WebSocket CRDT sync server.
# Build from the services/collab-server directory:
#   docker build -t lazynext-collab-server .
#
# The server listens on port 8004 for WebSocket connections.

FROM rust:1.96-slim AS chef
RUN cargo install cargo-chef
WORKDIR /build

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ── Build Stage ────────────────────────────────────────────────────────
FROM chef AS builder
COPY --from=planner /build/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

# ── Runtime Stage ──────────────────────────────────────────────────────
FROM debian:trixie-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/collab-server /usr/local/bin/collab-server

EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8004/health || exit 1

CMD ["/usr/local/bin/collab-server"]
