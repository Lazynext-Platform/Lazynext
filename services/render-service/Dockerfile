# ── Standalone render-service (local deps only) ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs renderer

# Copy api-client package
COPY packages/api-client/ ./packages/api-client/

# Copy service source
COPY services/render-service/src/ ./src/
COPY services/render-service/package.json ./

# Replace workspace protocol with file: for local resolution
RUN sed -i 's/"workspace:\*"/"file:.\/packages\/api-client"/g' package.json && \
    bun install --production 2>&1 | tail -5

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
