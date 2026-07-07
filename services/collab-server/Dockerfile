# ── Collab Server (Rust Axum) ────────────────────────────────────────────
# Real-time WebSocket collaboration server with CRDT state sync, presence
# tracking, and peer discovery. Built with Axum and Rust CRDT crates.
FROM rust:1.96-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev libasound2-dev curl \
    libegl1-mesa-dev libxcb-shape0-dev libxcb-xfixes0-dev \
    libxkbcommon-dev libwayland-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN cargo build --release -p collab-server

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libssl3 libasound2 && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 lazynext && useradd --system --uid 1001 --gid lazynext collab
COPY --from=0 /app/target/release/collab-server /usr/local/bin/collab-server
USER collab
EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8004/health || exit 1
CMD ["/usr/local/bin/collab-server"]
