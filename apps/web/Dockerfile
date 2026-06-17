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

# Build-time env vars (required by Zod validation during next build)
ENV SKIP_ENV_VALIDATION=1
ENV MARBLE_WORKSPACE_KEY=ci-placeholder
ENV FREESOUND_CLIENT_ID=ci-placeholder
ENV FREESOUND_API_KEY=ci-placeholder
ENV NEXT_PUBLIC_MARBLE_API_URL=https://api.marblecms.com
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV BETTER_AUTH_SECRET=ci-placeholder-secret-key-for-build
ENV UPSTASH_REDIS_REST_URL=http://localhost:8079
ENV UPSTASH_REDIS_REST_TOKEN=ci-placeholder

RUN bun run build

# Start the application
CMD ["bun", "run", "start"]
EXPOSE 3000
