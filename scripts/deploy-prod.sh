#!/usr/bin/env bash
set -euo pipefail
# ── Lazynext Production Deploy Script ─────────────────────────────────
# Runs AFTER cross-compilation (cargo build --release --target x86_64-unknown-linux-musl)
# Expects binaries at target/x86_64-unknown-linux-musl/release/

ACR="lazynextacrdevlmblwn.azurecr.io"
BINARY_DIR="target/x86_64-unknown-linux-musl/release"

echo "=== Building Docker images for amd64 ==="

# Collab Server
docker buildx build --platform linux/amd64 \
  -t ${ACR}/lazynext-collab-server:latest \
  -f services/collab-server/Dockerfile . --push

# API Gateway
docker buildx build --platform linux/amd64 \
  -t ${ACR}/lazynext-api-gateway:latest \
  -f rust/api-gateway/Dockerfile . --push

echo "=== Updating Azure Container Apps ==="

az containerapp update \
  --resource-group lazynext-rg-dev \
  --name lazynext-collab-server-dev \
  --image ${ACR}/lazynext-collab-server:latest

az containerapp update \
  --resource-group lazynext-rg-dev \
  --name lazynext-api-gateway-dev \
  --image ${ACR}/lazynext-api-gateway:latest

echo "=== Waiting for revisions to be active ==="
sleep 30

echo "=== Running E2E tests ==="
API_GATEWAY_URL="https://lazynext-api-gateway-dev.salmonground-46f7bb5d.southeastasia.azurecontainerapps.io" \
WEB_URL="https://lazynext-web-dev.salmonground-46f7bb5d.southeastasia.azurecontainerapps.io" \
RENDER_SERVICE_URL="https://lazynext-render-dev.salmonground-46f7bb5d.southeastasia.azurecontainerapps.io" \
PREPROC_URL="https://lazynext-pre-processing-dev.salmonground-46f7bb5d.southeastasia.azurecontainerapps.io" \
AI_AGENTS_URL="https://lazynext-ai-agents-dev.salmonground-46f7bb5d.southeastasia.azurecontainerapps.io" \
./scripts/full-e2e.sh

echo "=== Deployment Complete ==="
