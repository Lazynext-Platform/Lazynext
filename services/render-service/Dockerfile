FROM oven/bun:1

WORKDIR /app

COPY package.json ./
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN bun install

COPY . .

EXPOSE 8003

CMD ["bun", "run", "start"]
