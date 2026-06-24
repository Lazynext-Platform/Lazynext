# Build from the repository root:
#   docker build -f rust/mcp-server/Dockerfile .
#
# This Dockerfile builds the MCP server binary.  The server communicates
# over stdio (stdin/stdout) per the Model Context Protocol specification —
# there is no TCP listener.  Run it with stdin attached:
#   docker run -i --rm lazynext-mcp-server
FROM rust:1.96-slim AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/

# Stub missing workspace members so the workspace resolver can find them.
# When these crates are fully implemented their real Cargo.toml + src/
# will be present in the rust/ copy above and these stubs become no-ops.
RUN mkdir -p apps/desktop/src && echo 'fn main() {}' > apps/desktop/src/main.rs && \
    echo '[package]\nname = "lazynext_desktop"\nversion = "0.0.0"\nedition = "2024"' > apps/desktop/Cargo.toml
RUN mkdir -p services/collab-server/src && echo 'fn main() {}' > services/collab-server/src/main.rs && \
    echo '[package]\nname = "lazynext_collab_server"\nversion = "0.0.0"\nedition = "2024" \n[dependencies]\ntokio = { version = "1", features = ["full"] }\naxum = "0.8"\nserde = "1"\nserde_json = "1"' > services/collab-server/Cargo.toml
RUN cargo build --release --bin lazynext_mcp_server

# Use same base as builder to match glibc
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/target/release/lazynext_mcp_server /usr/local/bin/mcp_server

# MCP servers use stdio, not TCP.  No port is exposed.
# STDIN/STDOUT carry JSON-RPC 2.0 messages.
CMD ["/usr/local/bin/mcp_server"]
