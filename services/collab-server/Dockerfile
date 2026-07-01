# Lazynext Collab Server Dockerfile
# Build context must be project root (where Cargo.toml workspace is)
FROM rust:1.96-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build -p collab-server --release

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libssl3 && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/collab-server /usr/local/bin/collab-server
EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8004/health || exit 1
CMD ["/usr/local/bin/collab-server"]
