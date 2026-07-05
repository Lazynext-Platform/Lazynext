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

# Copy workspace root + packages + service + stub wasm
COPY package.json bun.lock ./
COPY packages/ packages/
COPY services/social-publish/ services/social-publish/
RUN mkdir -p rust/wasm/pkg && echo '{"name":"lazynext-wasm","version":"0.0.0","private":true}' > rust/wasm/pkg/package.json
RUN bun install --no-lockfile

# Set working dir to service
WORKDIR /app/services/social-publish

RUN mkdir -p /tmp/social-outputs && chown -R svcpublish:svcpublish /tmp/social-outputs /app

USER svcpublish

ENV NODE_ENV=production
ENV PORT=8007
ENV OUTPUT_DIR=/tmp/social-outputs

EXPOSE 8007

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8007/health || exit 1

CMD ["bun", "run", "src/index.ts"]
