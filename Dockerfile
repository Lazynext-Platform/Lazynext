FROM oven/bun:debian AS base

FROM base AS builder

WORKDIR /app

# Install Rust & wasm-pack dependencies
RUN apt-get update && apt-get install -y curl build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && export PATH="$HOME/.cargo/bin:$PATH" \
    && curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Set PATH for Rust
ENV PATH="/root/.cargo/bin:${PATH}"

COPY package.json package.json
COPY bun.lock bun.lock
COPY turbo.json turbo.json

# Copy Rust code and build WASM first
COPY rust/ rust/
WORKDIR /app/rust/wasm
RUN wasm-pack build --target bundler --out-dir pkg

WORKDIR /app
COPY apps/web/package.json apps/web/package.json
# Install dependencies (will link the built WASM package)
RUN bun install

COPY apps/web/ apps/web/

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env stubs to pass validation
ENV DATABASE_URL="postgresql://lazynext:lazynext@localhost:5432/lazynext"
ENV BETTER_AUTH_SECRET="build-time-secret"
ENV UPSTASH_REDIS_REST_URL="http://localhost:8079"
ENV UPSTASH_REDIS_REST_TOKEN="example_token"
ENV NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ENV NEXT_PUBLIC_MARBLE_API_URL="https://api.marble.example.com"
ENV MARBLE_WORKSPACE_KEY="test_workspace_key"
ENV FREESOUND_CLIENT_ID="test_client_id"
ENV FREESOUND_API_KEY="test_api_key"

WORKDIR /app/apps/web
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

RUN chown nextjs:nodejs apps

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "apps/web/server.js"]
