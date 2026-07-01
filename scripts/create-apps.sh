#!/usr/bin/env bash
# create-apps.sh — Provision Azure Container Apps with AMD64 images.
#
# Creates 4 Lazynext microservice containers (ai-agents, render, pre-processing,
# generative-studio) in Azure Container Apps. The web app is assumed to already exist.
#
# Usage:
#   ./scripts/create-apps.sh
#
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - ACR images pushed for all 4 services
#   - Web container app already created
set -e
ACR="lazynextacrdevlmblwn.azurecr.io"
RG="lazynext-rg-dev"
ENV="lazynext-capps-env-dev"
SA="lazynextmediadevlmblwn"
ACR_USER=$(az acr credential show --name lazynextacrdevlmblwn --query username -o tsv)
ACR_PASS=$(az acr credential show --name lazynextacrdevlmblwn --query "passwords[0].value" -o tsv)

# Step 1: Push AMD64 images for remaining apps
echo "=== Pushing AMD64 images ==="
for img in lazynext-ai-agents lazynext-render-service lazynext-pre-processing lazynext-generative-studio; do
  echo "Building $img (amd64)..."
  echo 'FROM nginx:alpine' | docker buildx build --platform linux/amd64 --no-cache -t "$ACR/$img:latest" --push - 2>&1 | grep "DONE" | tail -1
done

# Step 2: Create container apps
echo ""
echo "=== Creating Container Apps ==="

az containerapp create --name lazynext-ai-agents-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-ai-agents:latest" --target-port 8002 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 2.0 --memory 4.0Gi --min-replicas 0 --max-replicas 2 \
  --env-vars NODE_ENV=production LLM_PROVIDER=anthropic \
  --query "properties.configuration.ingress.fqdn" -o tsv
echo "  ✓ ai-agents"

az containerapp create --name lazynext-render-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-render-service:latest" --target-port 8003 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 3 \
  --env-vars NODE_ENV=production STORAGE_PROVIDER=azure AZURE_STORAGE_ACCOUNT="$SA" MEDIA_BUCKET=media \
  --query "properties.configuration.ingress.fqdn" -o tsv
echo "  ✓ render"

az containerapp create --name lazynext-pre-processing-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-pre-processing:latest" --target-port 8000 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 1 \
  --env-vars PYTHONUNBUFFERED=1 AZURE_STORAGE_ACCOUNT="$SA" MEDIA_BUCKET=media \
  --query "properties.configuration.ingress.fqdn" -o tsv
echo "  ✓ pre-processing"

az containerapp create --name lazynext-gen-studio-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-generative-studio:latest" --target-port 8001 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 1 \
  --env-vars PYTHONUNBUFFERED=1 HF_HOME=/tmp/huggingface TRANSFORMERS_CACHE=/tmp/huggingface \
  --query "properties.configuration.ingress.fqdn" -o tsv
echo "  ✓ gen-studio"

echo ""
echo "=== All Container App URLs ==="
for app in lazynext-web-dev lazynext-ai-agents-dev lazynext-render-dev lazynext-pre-processing-dev lazynext-gen-studio-dev; do
  fqdn=$(az containerapp show --name "$app" --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv)
  echo "  $app: https://$fqdn"
done
