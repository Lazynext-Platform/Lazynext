# ── Stage 1: Build ──
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json bun.lock bunfig.toml ./

# Copy packages needed by render-service (must be in packages/ for workspace:* resolution)
COPY packages/ packages/

# Copy the service itself
COPY services/render-service/ services/render-service/

# Create stub for wasm (render-service doesn't need it but bun.lock references it)
RUN mkdir -p rust/wasm/pkg && echo '{"name":"lazynext-wasm","version":"0.0.0","private":true}' > rust/wasm/pkg/package.json

# Install with workspace support
RUN bun install --filter=lazynext-render-service --production 2>&1 | tail -5

# Copy source
COPY services/render-service/src/ services/render-service/src/

# ── Stage 2: Runtime ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs renderer

COPY --from=builder /app/services/render-service/ ./

RUN mkdir -p /tmp/renders && chown -R renderer:nodejs /tmp/renders /app

USER renderer

ENV NODE_ENV=production
ENV PORT=8003
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8003/health || exit 1

CMD ["bun", "run", "src/index.ts"]
