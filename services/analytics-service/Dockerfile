# ── Stage 1: Build ──
FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

# Layer 1: Workspace dependencies (root package.json + packages)
COPY package.json bun.lock ./
COPY packages/ packages/
COPY services/analytics-service/ services/analytics-service/
RUN bun install --no-lockfile

# Build the service
WORKDIR /app/services/analytics-service
RUN bun run build 2>/dev/null || echo "No build step (JS entrypoint)"

# ── Stage 2: Runtime ──
FROM oven/bun:1.3.14-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy production deps + source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/analytics-service/package.json ./
COPY --from=builder /app/services/analytics-service/src/ ./src

USER nodejs

ENV NODE_ENV=production
ENV PORT=8006

EXPOSE 8006

# oven/bun:alpine ships with wget (via BusyBox)
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8006/health || exit 1

CMD ["bun", "run", "src/index.ts"]
