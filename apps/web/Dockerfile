# Use an official Node.js runtime as a parent image
FROM oven/bun:1 as base

# Set working directory
WORKDIR /app

# Install Rust toolchain to build the WASM module
RUN apt-get update && apt-get install -y curl build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack

# Copy the entire monorepo
COPY . .

# Build the Rust WASM module
RUN ./build-wasm.sh

# Change to the web app directory
WORKDIR /app/apps/web

# Install dependencies and build the Next.js app
RUN bun install
RUN bun run build

# Start the application
CMD ["bun", "run", "start"]
EXPOSE 3000
