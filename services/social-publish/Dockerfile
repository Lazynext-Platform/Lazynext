# ── Social Publish Service ──
FROM oven/bun:1.3-slim AS runner

WORKDIR /app

# Install FFmpeg for reframing and thumbnail extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --system --uid 1001 --create-home --shell /bin/false svcpublish

# Copy only this service's files (isolated from workspace)
COPY services/social-publish/package.json ./
COPY packages/ packages/
RUN bun install --production

COPY services/social-publish/tsconfig.json ./
COPY services/social-publish/src/ src/

RUN mkdir -p /tmp/social-outputs && chown -R svcpublish:svcpublish /tmp/social-outputs /app

USER svcpublish

ENV NODE_ENV=production
ENV PORT=8007
ENV OUTPUT_DIR=/tmp/social-outputs

EXPOSE 8007

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8007/health || exit 1

CMD ["bun", "run", "src/index.ts"]
