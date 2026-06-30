# Production Deployment Runbook

> **Platform**: Lazynext v1.0
> **Infrastructure**: Azure Container Apps + PostgreSQL + Redis
> **Last Updated**: 2026-07-01

## Pre-Deployment Checklist

- [ ] All CI checks pass on `main` (GitHub Actions)
- [ ] Docker images built and pushed to ACR (`lazynextacrproduction.azurecr.io`)
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `BETTER_AUTH_SECRET` is a 64-char random hex string (not dev fallback)
- [ ] Stripe webhook secret configured for production Stripe account
- [ ] SSL certificates valid (Azure Managed Certificates)
- [ ] Redis cache flushed if schema changed
- [ ] Database migrations tested against staging

## Quick Deploy

```bash
# 1. Login to Azure
az login

# 2. Set subscription
az account set --subscription "Lazynext Production"

# 3. Run deployment (build + push + deploy)
export AZURE_REGION=eastus2
./scripts/deploy.sh

# Or trigger via GitHub Actions:
# Go to https://github.com/Lazynext-Platform/Lazynext/actions/workflows/production.yml
# Click "Run workflow" → confirm
```

## Manual Deploy Steps

### Build & Push Images

```bash
ACR="lazynextacrproduction.azurecr.io"
az acr login --name lazynextacrproduction

# Build all 9 service images
docker build -t $ACR/lazynext-web:latest -f apps/web/Dockerfile apps/web
docker build -t $ACR/lazynext-api-gateway:latest -f rust/api-gateway/Dockerfile rust
docker build -t $ACR/lazynext-ai-agents:latest -f services/ai-agents/Dockerfile services/ai-agents
docker build -t $ACR/lazynext-render-service:latest -f services/render-service/Dockerfile services/render-service
docker build -t $ACR/lazynext-pre-processing:latest -f services/pre-processing/Dockerfile services/pre-processing
docker build -t $ACR/lazynext-generative-studio:latest -f services/generative-studio/Dockerfile services/generative-studio
docker build -t $ACR/lazynext-collab-server:latest -f services/collab-server/Dockerfile services/collab-server
docker build -t $ACR/lazynext-analytics-service:latest -f services/analytics-service/Dockerfile services/analytics-service
docker build -t $ACR/lazynext-mcp:latest -f rust/mcp-server/Dockerfile .
docker build -t $ACR/lazynext-migrate:latest -f Dockerfile.migrate .

# Push all
for img in web api-gateway ai-agents render-service pre-processing generative-studio collab-server analytics-service mcp migrate; do
  docker push $ACR/lazynext-$img:latest
done
```

### Run Migrations

```bash
az containerapp job start \
  --name db-migrate \
  --resource-group lazynext-rg-production
```

### Deploy Services

```bash
RG="lazynext-rg-production"
ENV="lazynext-capps-env-prod"
ACR="lazynextacrproduction"

# API Gateway (deploy first — other services depend on it)
az containerapp update \
  --name lazynext-api-gateway-prod \
  --resource-group $RG \
  --image $ACR.azurecr.io/lazynext-api-gateway:latest || \
az containerapp create \
  --name lazynext-api-gateway-prod \
  --resource-group $RG \
  --environment $ENV \
  --image $ACR.azurecr.io/lazynext-api-gateway:latest \
  --target-port 8005 --ingress external \
  --min-replicas 1 --max-replicas 4 \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars DATABASE_URL=secretref:database-url BETTER_AUTH_SECRET=secretref:better-auth-secret

# Web App
az containerapp update \
  --name lazynext-web-prod \
  --resource-group $RG \
  --image $ACR.azurecr.io/lazynext-web:latest

# Deploy remaining services
for svc in ai-agents render-service pre-processing generative-studio collab-server analytics-service; do
  az containerapp update \
    --name "lazynext-${svc}-prod" \
    --resource-group $RG \
    --image "$ACR.azurecr.io/lazynext-${svc}:latest"
done
```

## Verify Deployment

```bash
# Run E2E tests against production
API_GATEWAY_URL=https://lazynext-api-gateway-prod.example.com \
WEB_URL=https://lazynext-web-prod.example.com \
SKIP_SERVICES=1 \
  ./scripts/full-e2e.sh

# Check all services healthy
for url in \
  https://lazynext-api-gateway-prod.example.com/health \
  https://lazynext-web-prod.example.com \
  https://lazynext-ai-agents-prod.example.com/health \
  https://lazynext-render-prod.example.com/health \
  https://lazynext-collab-server-prod.example.com/health; do
  curl -sf "$url" && echo " OK" || echo " FAIL"
done
```

## Rollback Procedure

```bash
# Find the previous working revision
az containerapp revision list \
  --name lazynext-web-prod \
  --resource-group lazynext-rg-production \
  --query "[?properties.active].name" -o tsv

# Activate a specific revision
az containerapp revision activate \
  --name lazynext-web-prod \
  --resource-group lazynext-rg-production \
  --revision web-prod--abc123def

# Monitor rollback
az containerapp revision list \
  --name lazynext-web-prod \
  --resource-group lazynext-rg-production \
  -o table
```

## Incident Response

### Critical Alerts

| Alert | Severity | Runbook |
|-------|----------|---------|
| CPU > 80% | 2 | Scale up `--max-replicas`, check for infinite loops |
| Memory > 85% | 2 | Restart service, increase `--memory`, check for leaks |
| 5xx Rate > 2% | 1 | Check logs, rollback to last known good revision |
| Replica Count = 0 | 1 | Verify container image exists in ACR, check env vars |
| SLO Burn Rate Critical | Critical | Immediate investigation, see `slo-burn-rate.md` |
| Database Down | Critical | Check Azure PostgreSQL status, verify connection string |

### Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | PagerDuty rotation |
| Database Admin | dba@lazynext.ai |
| Security Incident | security@lazynext.ai |

## Scheduled Maintenance

### Daily
- Review Azure Monitor Alert history
- Check Grafana dashboards for anomalies
- Verify backup completion (`scripts/backup-db.sh` logs)

### Weekly
- Rotate API keys (`scripts/rotate-secrets.sh`)
- Review SLO compliance (99.9% target)
- Check disk usage on PostgreSQL and Redis

### Monthly
- Load test with K6 (`k6 run scripts/load-test.js --vus 100`)
- Review and update runbooks
- Test disaster recovery procedure
