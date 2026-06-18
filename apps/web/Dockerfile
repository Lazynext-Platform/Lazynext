# ── Stage 1: Build WASM (Rust toolchain) ──
FROM oven/bun:1.3 AS wasm-builder

WORKDIR /wasm

RUN apt-get update && apt-get install -y --no-install-recommends curl build-essential \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack

COPY rust/ /wasm/rust/
COPY build-wasm.sh /wasm/

RUN cd /wasm && ./build-wasm.sh

# ── Stage 2: Build Next.js app ──
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Install deps first for layer caching
COPY package.json bun.lock bunfig.toml ./
COPY apps/web/package.json apps/web/package.json

# Need biome.json for the lint config, is not required at runtime
COPY biome.json .
COPY eslint.config.mjs .

RUN bun install

# Copy WASM artifact from stage 1
COPY --from=wasm-builder /wasm/rust/wasm/pkg /app/rust/wasm/pkg

# Copy source
COPY apps/web/ apps/web/
COPY .env.example apps/web/.env.local

WORKDIR /app/apps/web

ENV SKIP_ENV_VALIDATION=1
ENV MARBLE_WORKSPACE_KEY=ci-placeholder
ENV FREESOUND_CLIENT_ID=ci-placeholder
ENV FREESOUND_API_KEY=ci-placeholder
ENV NEXT_PUBLIC_MARBLE_API_URL=https://api.marblecms.com
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV BETTER_AUTH_SECRET=ci-placeholder-secret-key-for-build
ENV UPSTASH_REDIS_REST_URL=http://localhost:8079
ENV UPSTASH_REDIS_REST_TOKEN=ci-placeholder
ENV NEXT_PUBLIC_SITE_URL=https://lazynext.com
ENV NEXT_PUBLIC_PREPROCESSING_URL=http://localhost:8000
ENV NEXT_PUBLIC_GENERATIVE_STUDIO_URL=http://localhost:8001
ENV NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8002
ENV NEXT_PUBLIC_RENDER_SERVICE_URL=http://localhost:8003

RUN bun run build

# ── Stage 3: Production runtime ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy WASM artifacts needed at runtime
COPY --from=builder /app/rust/wasm/pkg ./rust/wasm/pkg

# Copy drizzle migrations for runtime DB operations
COPY --from=builder /app/apps/web/drizzle ./apps/web/drizzle
COPY --from=builder /app/apps/web/migrations ./apps/web/migrations
COPY --from=builder /app/apps/web/migrate.ts ./apps/web/migrate.ts

USER nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["bun", "run", "apps/web/server.js"]
