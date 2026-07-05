# ── Stage 1: Build ──
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Layer 1: Workspace dependencies (root package.json + packages)
COPY package.json bun.lock ./
COPY packages/ packages/
COPY services/ai-agents/ services/ai-agents/
RUN bun install --no-lockfile

# Build the service
WORKDIR /app/services/ai-agents
RUN bun run build 2>/dev/null || echo "No build step (JS entrypoint)"

# ── Stage 2: Runtime ──
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

# Install npm/npx for MCP server support
RUN apk add --no-cache npm

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Copy production deps + source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/ai-agents/package.json ./
COPY --from=builder /app/services/ai-agents/src/ ./src

USER nodejs

ENV NODE_ENV=production
ENV PORT=8002

EXPOSE 8002

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8002/health || exit 1

CMD ["bun", "run", "src/index.ts"]
