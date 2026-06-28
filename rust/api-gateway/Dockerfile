FROM rust:1.80-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire workspace since we depend on other crates (core, neural_engine)
# NOTE: This Dockerfile expects to be built with `rust/` as the build context.
# e.g., docker build -f api-gateway/Dockerfile .
COPY . .

# Build the api-gateway binary
RUN cargo build -p lazynext_api_gateway --release

FROM debian:bookworm-slim

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
