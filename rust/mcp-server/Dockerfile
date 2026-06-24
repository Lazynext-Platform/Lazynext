FROM rust:1.96-slim AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/
# Stub missing workspace members
RUN mkdir -p apps/desktop/src && echo 'fn main() {}' > apps/desktop/src/main.rs && \
    echo '[package]\nname = "lazynext_desktop"\nversion = "0.0.0"\nedition = "2024"' > apps/desktop/Cargo.toml
RUN mkdir -p services/collab-server/src && echo 'fn main() {}' > services/collab-server/src/main.rs && \
    echo '[package]\nname = "lazynext_collab_server"\nversion = "0.0.0"\nedition = "2024" \n[dependencies]\ntokio = { version = "1", features = ["full"] }\naxum = "0.8"\nserde = "1"\nserde_json = "1"' > services/collab-server/Cargo.toml
RUN cargo build --release --bin lazynext_mcp_server

# Use same base as builder to match glibc
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/target/release/lazynext_mcp_server /usr/local/bin/mcp_server
EXPOSE 5173
CMD ["/usr/local/bin/mcp_server"]
