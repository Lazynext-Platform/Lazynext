# ── Stage 1: Build WASM (Rust toolchain) ──
# Skipped when SKIP_WASM_BUILD=1 (CI provides pre-built artifact)
FROM oven/bun:1.3 AS wasm-builder

WORKDIR /wasm

ARG SKIP_WASM_BUILD=0

COPY build-wasm.sh /wasm/

RUN if [ "$SKIP_WASM_BUILD" = "1" ]; then \
      mkdir -p /wasm/rust/wasm/pkg && \
      echo "Skipping WASM build — using pre-built artifact from CI."; \
    else \
      apt-get update && apt-get install -y --no-install-recommends curl build-essential ca-certificates && \
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --profile minimal && \
      . $HOME/.cargo/env && \
      cargo install wasm-pack && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Copy WASM package (pre-built when SKIP_WASM_BUILD=1, or to be built)
COPY rust/ /wasm/rust/

RUN if [ "$SKIP_WASM_BUILD" != "1" ]; then \
      cd /wasm && ./build-wasm.sh; \
    else \
      echo "Verifying pre-built WASM package..."; \
      ls -la /wasm/rust/wasm/pkg/ 2>/dev/null || echo "WARNING: No pre-built WASM files found"; \
      [ -f /wasm/rust/wasm/pkg/package.json ] || echo '{"name":"lazynext-wasm","version":"0.0.0","private":true,"main":"lazynext_wasm.js","types":"lazynext_wasm.d.ts"}' > /wasm/rust/wasm/pkg/package.json; \
    fi

# ── Stage 2: Build Next.js app ──
FROM oven/bun:1.3 AS builder

WORKDIR /app

ARG SKIP_WASM_BUILD=0

# Install deps first for layer caching
COPY package.json bun.lock bunfig.toml ./
COPY apps/web/package.json apps/web/package.json

# Need biome.json for the lint config, is not required at runtime
COPY biome.json .
COPY eslint.config.mjs .

# Create stub wasm workspace so bun install resolves without errors
RUN mkdir -p /app/rust/wasm/pkg && echo '{"name":"lazynext-wasm","version":"0.0.0","private":true}' > /app/rust/wasm/pkg/package.json

RUN bun install

# Copy source
COPY apps/web/ apps/web/
COPY .env.example apps/web/.env.local

# Copy pre-built WASM package directly into node_modules (after bun install + source COPY)
COPY rust/wasm/pkg /app/node_modules/lazynext-wasm
COPY rust/wasm/pkg /app/apps/web/node_modules/lazynext-wasm

WORKDIR /app/apps/web

ENV SKIP_ENV_VALIDATION=1
ENV NODE_PATH=/app/node_modules
ENV MARBLE_WORKSPACE_KEY=ci-placeholder
ENV FREESOUND_CLIENT_ID=ci-placeholder
ENV FREESOUND_API_KEY=ci-placeholder
ENV NEXT_PUBLIC_MARBLE_API_URL=https://api.marblecms.com
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV BETTER_AUTH_SECRET=ci-placeholder-secret-key-for-build
ENV UPSTASH_REDIS_REST_URL=http://localhost:8079
ENV UPSTASH_REDIS_REST_TOKEN=ci-placeholder
# Build-time ARGs for service URLs — override in CI with production FQDNs
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

# Bundle the migration script so it doesn't rely on Next.js standalone node_modules
RUN bun build migrate.ts --target=bun --outfile=migrate.js

# ── Stage 3: Production runtime ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Create cache directory and set ownership
RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy WASM artifacts needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/rust/wasm/pkg ./rust/wasm/pkg

# Copy drizzle migrations for runtime DB operations
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
