# ── Stage 1: Build ──
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Layer 1: Workspace dependencies (root package.json + packages)
COPY package.json bun.lock ./
COPY packages/ packages/
COPY services/render-service/ services/render-service/
RUN bun install --no-lockfile

# Build the service
WORKDIR /app/services/render-service
RUN bun run build 2>/dev/null || echo "No build step (JS entrypoint)"

# ── Stage 2: Runtime ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

# Install FFmpeg (only runtime dep beyond Bun)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs renderer

# Copy production deps + source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/render-service/package.json ./
COPY --from=builder /app/services/render-service/src/ ./src

# Create temp directory for FFmpeg processing
RUN mkdir -p /tmp/renders && chown -R renderer:nodejs /tmp/renders

USER renderer

ENV NODE_ENV=production
ENV PORT=8003
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8003/health || exit 1

CMD ["bun", "run", "src/index.ts"]
