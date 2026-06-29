FROM rust:1.96-slim AS chef
# Install cargo-chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
# Copy the entire workspace since we depend on other crates (core, neural_engine)
# NOTE: This Dockerfile expects to be built with `rust/` as the build context.
# e.g., docker build -f api-gateway/Dockerfile .
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build -p lazynext_api_gateway --release

FROM debian:trixie-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/lazynext_api_gateway /app/api-gateway

# Set environment variables for production
ENV RUST_LOG=info
ENV PORT=8005

EXPOSE 8005

CMD ["/app/api-gateway"]
