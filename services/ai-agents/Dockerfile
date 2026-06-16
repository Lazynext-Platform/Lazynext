FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build || true # Build if TS, otherwise ignore

EXPOSE 8002

CMD ["bun", "start"]
