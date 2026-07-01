FROM rust:1.96-slim
RUN apt-get update && apt-get install -y pkg-config libssl-dev libasound2-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/
COPY apps/desktop/Cargo.toml apps/desktop/
COPY services/collab-server/ services/collab-server/
RUN mkdir -p apps/desktop/src rust/core/src rust/p2p-sync/src rust/plugin-api/src rust/provenance/src rust/temporal-versioning/src rust/wasm/src rust/mcp-server/src rust/api-gateway/src rust/cli/src
RUN for d in rust/crates/*/; do mkdir -p "${d}src" && echo '' > "${d}src/lib.rs"; done
RUN echo 'fn main() {}' > apps/desktop/src/main.rs
RUN echo 'fn main() {}' > rust/core/src/main.rs && echo 'fn main() {}' > rust/p2p-sync/src/main.rs
RUN echo 'fn main() {}' > rust/plugin-api/src/main.rs && echo 'fn main() {}' > rust/provenance/src/main.rs
RUN echo 'fn main() {}' > rust/temporal-versioning/src/main.rs && echo 'fn main() {}' > rust/wasm/src/main.rs
RUN echo 'fn main() {}' > rust/mcp-server/src/main.rs && echo 'fn main() {}' > rust/api-gateway/src/main.rs
RUN echo 'fn main() {}' > rust/cli/src/main.rs
RUN cargo build --release -p collab-server

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=0 /app/target/release/collab-server /usr/local/bin/collab-server
EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -sf http://localhost:8004/health || exit 1
CMD ["/usr/local/bin/collab-server"]
