FROM oven/bun:1 as base

WORKDIR /app

COPY package.json bun.lockb* ./
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN bun install

COPY . .

EXPOSE 8003

CMD ["bun", "run", "start"]
