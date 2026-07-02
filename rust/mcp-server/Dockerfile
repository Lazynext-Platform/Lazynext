# Build from the repository root:
#   docker build -f rust/mcp-server/Dockerfile .
#
# This Dockerfile builds the MCP server binary.  The server communicates
# over stdio (stdin/stdout) per the Model Context Protocol specification —
# there is no TCP listener.  Run it with stdin attached:
#   docker run -i --rm lazynext-mcp-server

FROM rust:1.96-slim AS chef
RUN cargo install cargo-chef
WORKDIR /build

FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/
COPY apps/ apps/
COPY package.json ./
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /build/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/
COPY apps/ apps/
COPY package.json ./
RUN cargo build --release --bin lazynext_mcp_server

# Use same base as builder to match glibc
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 mcp && useradd --system --uid 1001 --gid mcp mcpserver
COPY --from=builder /build/target/release/lazynext_mcp_server /usr/local/bin/mcp_server
USER mcpserver

# MCP servers use stdio, not TCP.  No port is exposed.
# STDIN/STDOUT carry JSON-RPC 2.0 messages.
CMD ["/usr/local/bin/mcp_server"]
