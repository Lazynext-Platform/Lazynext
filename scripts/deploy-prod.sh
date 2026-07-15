#!/usr/bin/env bash
set -euo pipefail
# ── Lazynext Production Deploy Script ─────────────────────────────────
# Runs AFTER cross-compilation (cargo build --release --target x86_64-unknown-linux-musl)
# Expects binaries at target/x86_64-unknown-linux-musl/release/

REGISTRY="ghcr.io/lazynext-platform"
BINARY_DIR="target/x86_64-unknown-linux-musl/release"

echo "=== Building Docker images for amd64 ==="

# Collab Server
docker buildx build --platform linux/amd64 \
  -t ${REGISTRY}/lazynext-collab-server:latest \
  -f services/collab-server/Dockerfile . --push

# API Gateway
docker buildx build --platform linux/amd64 \
  -t ${REGISTRY}/lazynext-api-gateway:latest \
  -f rust/api-gateway/Dockerfile . --push

echo "=== Deploying via Docker Compose ==="

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --force-recreate

echo "=== Waiting for services to be ready ==="
sleep 30

echo "=== Running E2E tests ==="
API_GATEWAY_URL="http://localhost:8005" \
WEB_URL="http://localhost:3000" \
RENDER_SERVICE_URL="http://localhost:8003" \
PREPROC_URL="http://localhost:8000" \
AI_AGENTS_URL="http://localhost:8002" \
./scripts/full-e2e.sh

echo "=== Deployment Complete ==="
