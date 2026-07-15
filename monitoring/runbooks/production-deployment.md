# Production Deployment Runbook

> **Platform**: Lazynext v1.0
> **Infrastructure**: Docker Compose + PostgreSQL + Redis
> **Last Updated**: 2026-07-01

## Pre-Deployment Checklist

- [ ] All CI checks pass on `main` (GitHub Actions)
- [ ] Docker images built and pushed to GHCR (`ghcr.io/lazynext-platform`)
- [ ] `DATABASE_URL` points to production PostgreSQL
- [ ] `BETTER_AUTH_SECRET` is a 64-char random hex string (not dev fallback)
- [ ] Stripe webhook secret configured for production Stripe account
- [ ] SSL certificates valid (Let's Encrypt via Traefik)
- [ ] Redis cache flushed if schema changed
- [ ] Database migrations tested against staging

## Quick Deploy

```bash
# 1. SSH into production Linode
ssh lke-user@lazynext-prod

# 2. Pull latest and deploy via Docker Compose
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Or trigger via GitHub Actions:
# Go to https://github.com/Lazynext-Platform/Lazynext/actions/workflows/production.yml
# Click "Run workflow" → confirm
```

## Manual Deploy Steps

### Build & Push Images

```bash
GHCR="ghcr.io/lazynext-platform"
docker login ghcr.io -u $GHCR_USERNAME -p $GHCR_TOKEN

# Build all 9 service images
docker build -t $GHCR/lazynext-web:latest -f apps/web/Dockerfile apps/web
docker build -t $GHCR/lazynext-api-gateway:latest -f rust/api-gateway/Dockerfile rust
docker build -t $GHCR/lazynext-ai-agents:latest -f services/ai-agents/Dockerfile services/ai-agents
docker build -t $GHCR/lazynext-render-service:latest -f services/render-service/Dockerfile services/render-service
docker build -t $GHCR/lazynext-pre-processing:latest -f services/pre-processing/Dockerfile services/pre-processing
docker build -t $GHCR/lazynext-generative-studio:latest -f services/generative-studio/Dockerfile services/generative-studio
docker build -t $GHCR/lazynext-collab-server:latest -f services/collab-server/Dockerfile services/collab-server
docker build -t $GHCR/lazynext-analytics-service:latest -f services/analytics-service/Dockerfile services/analytics-service
docker build -t $GHCR/lazynext-mcp:latest -f rust/mcp-server/Dockerfile .
docker build -t $GHCR/lazynext-migrate:latest -f Dockerfile.migrate .

# Push all
for img in web api-gateway ai-agents render-service pre-processing generative-studio collab-server analytics-service mcp migrate; do
  docker push $GHCR/lazynext-$img:latest
done
```

### Run Migrations

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

### Deploy Services

```bash
GHCR="ghcr.io/lazynext-platform"

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Deploy all services
docker compose -f docker-compose.prod.yml up -d

# Scale individual services as needed
docker compose -f docker-compose.prod.yml up -d --scale api-gateway=4
docker compose -f docker-compose.prod.yml up -d --scale web=3
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
# Find the previous working images
docker compose -f docker-compose.prod.yml images

# Rollback to pinned tags
docker compose -f docker-compose.prod.yml pull lazynext-web:previous-stable
docker compose -f docker-compose.prod.yml up -d lazynext-web

# Check status
docker compose -f docker-compose.prod.yml ps
```

## Incident Response

### Critical Alerts

| Alert | Severity | Runbook |
|-------|----------|---------|
| CPU > 80% | 2 | Scale up `--max-replicas`, check for infinite loops |
| Memory > 85% | 2 | Restart service, increase `--memory`, check for leaks |
| 5xx Rate > 2% | 1 | Check logs, rollback to last known good revision |
| Replica Count = 0 | 1 | Verify container image exists in GHCR, check env vars |
| SLO Burn Rate Critical | Critical | Immediate investigation, see `slo-burn-rate.md` |
| Database Down | Critical | Check PostgreSQL (Docker) status, verify connection string |

### Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | Grafana OnCall rotation |
| Database Admin | dba@lazynext.ai |
| Security Incident | security@lazynext.ai |

## Scheduled Maintenance

### Daily
- Review Grafana Alert history
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
