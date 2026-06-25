#!/usr/bin/env bash
# Create all 5 Container Apps via Azure CLI (bypassing terraform ACR auth)
set -e
ACR="lazynextacrdevlmblwn.azurecr.io"
ACR_USER=$(az acr credential show --name lazynextacrdevlmblwn --query username -o tsv)
ACR_PASS=$(az acr credential show --name lazynextacrdevlmblwn --query "passwords[0].value" -o tsv)
RG="lazynext-rg-dev"
ENV="lazynext-capps-env-dev"
SA="lazynextmediadevlmblwn"

echo "=== Creating 5 Container Apps ==="

az containerapp create --name lazynext-web-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-web:latest" --target-port 3000 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 1.0 --memory 2.0Gi --min-replicas 0 --max-replicas 3 \
  --env-vars NODE_ENV=production STORAGE_PROVIDER=azure AZURE_STORAGE_ACCOUNT="$SA" MEDIA_BUCKET=media
echo "  ✓ web"

az containerapp create --name lazynext-ai-agents-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-ai-agents:latest" --target-port 8002 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 2.0 --memory 4.0Gi --min-replicas 0 --max-replicas 2 \
  --env-vars NODE_ENV=production LLM_PROVIDER=anthropic
echo "  ✓ ai-agents"

az containerapp create --name lazynext-render-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-render-service:latest" --target-port 8003 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 3 \
  --env-vars NODE_ENV=production STORAGE_PROVIDER=azure AZURE_STORAGE_ACCOUNT="$SA" MEDIA_BUCKET=media
echo "  ✓ render"

az containerapp create --name lazynext-pre-processing-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-pre-processing:latest" --target-port 8000 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 1 \
  --env-vars PYTHONUNBUFFERED=1 AZURE_STORAGE_ACCOUNT="$SA" MEDIA_BUCKET=media
echo "  ✓ pre-processing"

az containerapp create --name lazynext-gen-studio-dev --resource-group "$RG" --environment "$ENV" \
  --image "$ACR/lazynext-generative-studio:latest" --target-port 8001 --ingress external \
  --registry-server "$ACR" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
  --cpu 4.0 --memory 8.0Gi --min-replicas 0 --max-replicas 1 \
  --env-vars PYTHONUNBUFFERED=1 HF_HOME=/tmp/huggingface TRANSFORMERS_CACHE=/tmp/huggingface
echo "  ✓ gen-studio"

echo ""
echo "=== Container App URLs ==="
for app in lazynext-web-dev lazynext-ai-agents-dev lazynext-render-dev lazynext-pre-processing-dev lazynext-gen-studio-dev; do
  fqdn=$(az containerapp show --name "$app" --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv)
  echo "  $app: https://$fqdn"
done
