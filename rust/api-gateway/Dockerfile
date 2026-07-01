FROM rust:1.96-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
# Copy the entire workspace (project root is the context)
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build -p lazynext_api_gateway --release

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/lazynext_api_gateway /app/api-gateway
ENV RUST_LOG=info
ENV PORT=8005
EXPOSE 8005
CMD ["/app/api-gateway"]
