FROM oven/bun:1.3-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs runner

COPY packages/api-client/ ./packages/api-client/
COPY services/ai-agents/src/ ./src/
COPY services/ai-agents/package.json ./

RUN sed -i 's/"workspace:\*"/"file:.\/packages\/api-client"/g' package.json && \
    bun install --production 2>&1 | tail -3

RUN mkdir -p /tmp/output && chown -R runner:nodejs /tmp/output /app

USER runner

ENV NODE_ENV=production
ENV PORT=8002

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8002/health || exit 1

CMD ["bun", "run", "src/index.ts"]
