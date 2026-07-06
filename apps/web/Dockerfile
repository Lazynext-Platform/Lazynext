# ── Build Next.js ──
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy workspace root config
COPY package.json bun.lock bunfig.toml ./
COPY biome.json ./
COPY eslint.config.mjs ./

# Copy workspace members
COPY packages/ packages/
COPY services/ services/
COPY apps/web/ apps/web/

# Copy pre-built WASM package (real files from repo)
COPY rust/wasm/pkg /app/rust/wasm/pkg

# Install dependencies
RUN bun install 2>&1 | tail -3

# Create WASM symlink (bun workspace resolution fails in Docker)
RUN rm -rf /app/node_modules/lazynext-wasm && \
    ln -s ../rust/wasm/pkg /app/node_modules/lazynext-wasm && \
    mkdir -p /app/apps/web/node_modules && \
    rm -rf /app/apps/web/node_modules/lazynext-wasm && \
    ln -s ../../rust/wasm/pkg /app/apps/web/node_modules/lazynext-wasm

# Build Next.js
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

ARG NEXT_PUBLIC_SITE_URL=https://lazynext.com
ARG NEXT_PUBLIC_PREPROCESSING_URL=http://localhost:8000
ARG NEXT_PUBLIC_GENERATIVE_STUDIO_URL=http://localhost:8001
ARG NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8002
ARG NEXT_PUBLIC_RENDER_SERVICE_URL=http://localhost:8003

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_PREPROCESSING_URL=$NEXT_PUBLIC_PREPROCESSING_URL
ENV NEXT_PUBLIC_GENERATIVE_STUDIO_URL=$NEXT_PUBLIC_GENERATIVE_STUDIO_URL
ENV NEXT_PUBLIC_AI_AGENTS_URL=$NEXT_PUBLIC_AI_AGENTS_URL
ENV NEXT_PUBLIC_RENDER_SERVICE_URL=$NEXT_PUBLIC_RENDER_SERVICE_URL

RUN bunx next build

RUN bun build migrate.ts --target=bun --outfile=migrate.js

# ── Production runtime ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/rust/wasm/pkg ./rust/wasm/pkg
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/drizzle ./apps/web/drizzle
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/migrations ./apps/web/migrations
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/migrate.js ./apps/web/migrate.js

USER nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["bun", "run", "apps/web/server.js"]
