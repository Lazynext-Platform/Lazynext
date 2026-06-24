# ── Stage 1: Build ──
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN bun install --no-lockfile

COPY tsconfig.json ./
COPY src/ src/

RUN bun run build 2>/dev/null || echo "No build step (JS entrypoint)"

# ── Stage 2: Runtime ──
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src

USER nodejs

ENV NODE_ENV=production
ENV PORT=8005

EXPOSE 8005

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8005/health || exit 1

CMD ["bun", "run", "src/index.ts"]
