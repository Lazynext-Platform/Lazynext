# Lazynext Production Runbook

> **Document version:** 1.0 | **Last updated:** 2026-07-02
> **Target environment:** Production (Linode Docker Compose)
> **On-call rotation:** See Grafana OnCall schedule

---

## 1. Architecture Overview

```
                              INTERNET
                                  |
                         ┌────────┴────────┐
                         │   Cloudflare     │  DNS + DDoS Protection
                         └────────┬────────┘
                                  |
                    ┌─────────────┴─────────────┐
                    │   Traefik v3 (:80/:443)    │  Reverse Proxy + SSL (Let's Encrypt)
                    │   lazynext.com / api.*     │
                    └─────────────┬─────────────┘
                                  |
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
    ┌────┴────┐           ┌───────┴───────┐         ┌──────┴──────┐
    │  Web    │           │  API Gateway  │         │  Collab     │
    │ :3000   │           │  :8005 (Rust) │         │  :8004      │
    │ Next.js │           │  Axum         │         │  CRDT Sync  │
    └────┬────┘           └───────┬───────┘         └──────┬──────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │            │           │           │            │
    ┌────┴────┐ ┌─────┴────┐ ┌───┴────┐ ┌───┴─────┐ ┌────┴────┐
    │ Pre-    │ │ Generat. │ │  AI    │ │ Render  │ │Analytics│
    │Process  │ │ Studio   │ │Agents  │ │ Service │ │ Service │
    │ :8000   │ │ :8001    │ │ :8002  │ │ :8003   │ │ :8006   │
    │ Python  │ │ Python   │ │ Bun    │ │ Bun+FF  │ │ Bun     │
    └────┬────┘ └─────┬────┘ └───┬────┘ └───┬─────┘ └────┬────┘
         │            │           │           │            │
         └────────────┼───────────┼───────────┼────────────┘
                      │           │           │
                  ┌────┴────┐ ┌───┴─────┐ ┌───┴──────┐
                  │ Postgres│ │  Redis  │ │  Local   │
                  │ 16      │ │  7      │ │  Storage │
                  └─────────┘ └─────────┘ └──────────┘
                            │
         ┌──────────────────┼──────────────────┐
    ┌────┴────┐ ┌──────┴──────┐ ┌───────┴──────┐
    │Prometheus│ │ Grafana    │ │ AlertManager │
    │:9090     │ │ :3000      │ │ :9093        │
    └─────────┘ └────────────┘ └──────────────┘
```

## 2. Service Port Map

| Service | Port | Language | Internal URL | Public Route |
|---------|------|----------|-------------|-------------|
| Traefik | 80, 443 | Go | — | `lazynext.com`, `api.lazynext.com` |
| Web App | 3000 | Next.js/TS | `http://web:3000` | `lazynext.com` |
| Pre-Processing | 8000 | Python | `http://pre-processing:8000` | `api.lazynext.com/preprocessing` |
| Generative Studio | 8001 | Python | `http://generative-studio:8001` | `api.lazynext.com/generative` |
| AI Agents | 8002 | Bun/TS | `http://ai-agents:8002` | `api.lazynext.com/ai` |
| Render Service | 8003 | Bun/TS | `http://render-service:8003` | `api.lazynext.com/render` |
| Collab Server | 8004 | Rust | `http://collab-server:8004` | `api.lazynext.com/collab` |
| API Gateway | 8005 | Rust/Axum | `http://api-gateway:8005` | `api.lazynext.com/v1` |
| Analytics | 8006 | Bun/TS | `http://analytics-service:8006` | `api.lazynext.com/analytics` |
| Social Publish | 8007 | Bun/TS | `http://social-publish:8007` | `api.lazynext.com/publish` |
| PostgreSQL | 5432 | — | `postgres:5432` | (internal only) |
| Redis | 6379 | — | `redis:6379` | (internal only) |
| Prometheus | 9090 | — | `prometheus:9090` | `monitoring.lazynext.internal/prometheus` |
| Grafana | 3000 | — | `grafana:3000` | `monitoring.lazynext.internal/grafana` |
| AlertManager | 9093 | — | `alertmanager:9093` | `monitoring.lazynext.internal/alertmanager` |
| Loki | 3100 | — | `loki:3100` | (internal from Grafana) |
| Tempo | 3200, 4317, 4318 | — | `tempo:3200` | (internal) |

### Application Health Endpoints

| Service | Health Check URL | Method | Expected Response |
|---------|-----------------|--------|------------------|
| Web App | `/api/health` | GET | 200 `{"status":"ok"}` |
| Pre-Processing | `/health` | GET | 200 |
| Generative Studio | `/health` | GET | 200 |
| AI Agents | `/health` | GET | 200 |
| Render Service | `/health` | GET | 200 |
| Collab Server | `/health` | GET | 200 |
| API Gateway | `/health` | GET | 200 `{"status":"ok"}` |
| Analytics | `/health` | GET | 200 |
| Social Publish | `/health` | GET | 200 |

## 3. Common Operations

### Deploy

```bash
# Full production deploy
docker compose -f docker-compose.prod-full.yml --env-file .env.production up -d

# Rolling update (no downtime)
docker compose -f docker-compose.prod-full.yml --env-file .env.production up -d --no-deps [service-name]

# Deploy with forced rebuild
docker compose -f docker-compose.prod-full.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod-full.yml --env-file .env.production up -d
```

### Restart a Single Service

```bash
# Graceful restart (zero-downtime with multiple replicas)
docker compose -f docker-compose.prod-full.yml restart render-service

# Force restart (kill + start)
docker compose -f docker-compose.prod-full.yml up -d --force-recreate render-service
```

### Scale a Service

```bash
# Scale render workers
docker compose -f docker-compose.prod-full.yml up -d --scale render-service=5

# Verify
docker compose ps render-service
```

### View Logs

```bash
# Tail logs for a specific service
docker compose -f docker-compose.prod-full.yml logs -f --tail=200 render-service

# All services, filtered
docker compose -f docker-compose.prod-full.yml logs -f --tail=100 | grep -i error

# Last 30 minutes
docker compose -f docker-compose.prod-full.yml logs --since 30m api-gateway
```

### Database Operations

```bash
# Run migrations
docker compose -f docker-compose.prod-full.yml run --rm \
  -e DATABASE_URL=postgresql://lazynext:${DB_PASSWORD}@postgres:5432/lazynext \
  api-gateway bun run db:migrate

# Open psql shell
docker compose -f docker-compose.prod-full.yml exec postgres \
  psql -U lazynext -d lazynext

# Create a named backup
docker compose -f docker-compose.prod-full.yml exec postgres \
  pg_dump -U lazynext -d lazynext -Fc -f /backups/lazynext_$(date +%Y%m%d_%H%M%S).dump
```

### Rollback a Deployment

```bash
# Docker Compose doesn't support direct rollback.
# Roll back by deploying a previous image tag:
docker compose -f docker-compose.prod-full.yml up -d --no-deps \
  --scale render-service=0 render-service

# Then update the image tag to the previous version:
# Edit the compose file or set the environment variable with the old tag

# Docker Compose rollback (deploy previous image tag):
# docker compose -f docker-compose.prod-full.yml up -d --no-deps \
#   render-service:<previous-tag>
# Or use the deploy script with a specific tag:
TAG=v1.2.3 ./scripts/deploy-prod.sh
```

### Clear Render Queue (Emergency)

```bash
# Clear Redis render queue
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" \
  DEL lazynext:render:queue
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" \
  DEL lazynext:render:jobs:*
```

### Update SSL Certificates

```bash
# Force renewal (Traefik handles auto-renewal)
docker compose restart traefik

# Check certificate status
docker compose exec traefik ls -la /letsencrypt/

# Manual renewal (if auto-renewal fails):
docker compose exec traefik traefik cert --help
```

## 4. Emergency Procedures

### Service Recovery

**Service is down (all replicas):**
```bash
# 1. Check status
docker compose ps [service-name]

# 2. Check logs for crash reason
docker compose logs --tail=100 [service-name]

# 3. If container exited, check exit reason
docker compose ps -a | grep [service-name]

# 4. Force restart
docker compose up -d --force-recreate [service-name]

# 5. Verify health
curl -f http://localhost:[port]/health
```

**Service is unhealthy but running:**
```bash
# 1. Check resource usage
docker stats --no-stream $(docker compose ps -q [service-name])

# 2. Check for connection issues
docker compose exec [service-name] curl -f http://[dependency]:[port]/health

# 3. If OOM, increase memory limits in docker-compose.prod-full.yml
# and redeploy:
docker compose up -d [service-name]
```

### Database Recovery

**Database is down:**
```bash
# 1. Check PostgreSQL logs
docker compose logs --tail=200 postgres

# 2. Check disk space
docker compose exec postgres df -h /var/lib/postgresql/data

# 3. Check for corruption
docker compose exec postgres pg_isready -U lazynext -d lazynext

# 4. If disk is full, clean up old WAL files:
docker compose exec postgres pg_archivecleanup \
  /var/lib/postgresql/data/pgdata/pg_wal [oldest-needed-file]
```

**Restore from backup:**
```bash
# 1. Stop all application services
docker compose stop web ai-agents render-service pre-processing generative-studio \
  collab-server analytics-service social-publish api-gateway

# 2. Restore
docker compose exec -T postgres pg_restore \
  -U lazynext -d lazynext --clean --if-exists \
  < /data/postgresql-backups/lazynext_[date].dump

# 3. Restart services
docker compose up -d
```

**Database connection pool exhausted:**
```bash
# 1. Check current connections
docker compose exec postgres psql -U lazynext -d lazynext \
  -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections (use with caution):
docker compose exec postgres psql -U lazynext -d lazynext \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid();"

# 3. Increase max_connections in PostgreSQL config (requires restart):
# Edit the `command:` section in docker-compose.prod-full.yml
# Change: -c max_connections=200 → -c max_connections=400
docker compose restart postgres
```

### Redis Recovery

**Redis is down or unresponsive:**
```bash
# 1. Check Redis logs
docker compose logs --tail=100 redis

# 2. Check memory
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" INFO memory

# 3. Restart
docker compose restart redis

# 4. Verify persistence
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" \
  --rdb /data/dump.rdb
```

### Render Queue Recovery

**Queue is backed up (>100 jobs):**
```bash
# 1. Scale up render-service
docker compose up -d --scale render-service=5

# 2. Check if workers are processing
docker compose exec redis redis-cli -a "${REDIS_PASSWORD}" \
  LLEN lazynext:render:queue

# 3. Check for stalled jobs (stuck for >30min)
docker compose logs --since 30m render-service | grep -i error

# 4. If stalled, restart render workers
docker compose restart render-service
```

### SSL Certificate Emergency

**Certificate expired or expiring:**
```bash
# 1. Check cert info
echo | openssl s_client -servername lazynext.com -connect lazynext.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# 2. Force Traefik to re-check
docker compose restart traefik

# 3. If Traefik can't renew — switch to staging to avoid rate limits,
#    then switch back after debugging:
#    Set: LETSENCRYPT_STAGING=true in .env.production
#    Restart: docker compose restart traefik
```

### Full Outage Recovery

**Complete system recovery from scratch:**
```bash
# 1. Verify infrastructure is healthy
docker compose ps
docker compose logs --tail=50 postgres redis

# 2. Start core services in order
docker compose up -d postgres redis
sleep 10
docker compose up -d api-gateway collab-server
sleep 5
docker compose up -d pre-processing generative-studio analytical-service social-publish
sleep 5
docker compose up -d render-service ai-agents web
sleep 5
docker compose up -d traefik

# 3. Verify all services
./scripts/health-check.sh

# 4. Verify monitoring
curl -f http://localhost:9090/-/healthy
curl -f http://localhost:3000/api/health
```

## 5. Monitoring Alerts Reference

### Critical Alerts (Grafana OnCall + Slack #lazynext-alerts-critical)

| Alert | Trigger | Duration | Action |
|-------|---------|----------|--------|
| APIGatewayDown | `up{job="lazynext-api-gateway"} == 0` | 1m | Check API Gateway pod, restore |
| RenderQueueCriticalBacklog | `render_queue_size > 100` | 10m | Scale render workers |
| PaymentProcessingFailure | Payment webhook errors | 5m | Check Dodo Payments dashboard, webhook secret |
| HighRenderFailureRate | Failure rate > 5% | 10m | Check FFmpeg logs, storage access |
| DatabaseConnectionFailures | Connection refused > 5/min | 1m | Check DB pod, connection pool |
| WebAppDown | `up{job="lazynext-web"} == 0` | 5m | Restore web app |
| ZeroRenderWorkers | No active workers | 5m | Restart render-service |

### Warning Alerts (Slack #lazynext-alerts)

| Alert | Trigger | Duration | Action |
|-------|---------|----------|--------|
| HighCPUUsage | CPU > 80% | 5m | Scale or investigate |
| HighMemoryUsage | Memory > 85% | 5m | Increase limits, check for leaks |
| HighRenderFailureRate | Failure rate > 5% | 10m | Investigate FFmpeg |
| AIAgentErrorRate | Error rate > 10% | 10m | Check LLM provider status |
| RenderQueueBacklog | Queue > 50 jobs | 15m | Consider scaling |
| HighWebSocketDisconnectRate | >10/min disconnects | 10m | Check network |
| MediaProcessingBacklog | >100 files queued | 15m | Scale pre-processing |
| AuthFailureSpike | >20 auth failures/s | 10m | Check for brute-force |

### Info Alerts (Slack #lazynext-deployments)

| Alert | Trigger |
|-------|---------|
| NewDeployment | Deploy detected for any service |

## 6. Environment Variable Reference

### Required Variables

| Variable | Description | Format | Example |
|----------|-------------|--------|---------|
| `DB_USER` | PostgreSQL user | string | `lazynext` |
| `DB_PASSWORD` | PostgreSQL password (use secret) | string | `***` |
| `DATABASE_URL` | Full PostgreSQL connection URL | URL | `postgresql://lazynext:pass@postgres:5432/lazynext` |
| `BETTER_AUTH_SECRET` | Auth signing secret | 64+ chars | `openssl rand -base64 64` |
| `DOMAIN` | Primary domain | string | `lazynext.com` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | string | `***` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_PASSWORD` | Redis auth password | (empty) |
| `LLM_PROVIDER` | Default LLM provider | `gemini` |
| `STORAGE_PROVIDER` | Media storage backend | `local` |
| `MEDIA_DIR` | Media filesystem path | `/opt/lazynext/media` |
| `RENDER_PARALLELISM` | Parallel FFmpeg jobs per worker | `4` |
| `CF_API_EMAIL` | Cloudflare API email | `ops@lazynext.ai` |
| `CF_DNS_API_TOKEN` | Cloudflare DNS API token | (empty) |
| `ACME_EMAIL` | Let's Encrypt contact email | `ops@lazynext.ai` |
| `LETSENCRYPT_STAGING` | Use staging CA | `false` |
| `LETSENCRYPT_CA_SERVER` | ACME CA server URL | `https://acme-v02.api.letsencrypt.org/directory` |
| `TRAEFIK_LOG_LEVEL` | Traefik log level | `INFO` |
| `COLLAB_LOG_LEVEL` | Collab server log level | `info` |
| `API_GATEWAY_LOG_LEVEL` | API Gateway log level | `info` |
| `POSTHOG_KEY` | PostHog analytics key | (empty) |
| `DODO_PUBLISHABLE_KEY` | Dodo Payments publishable key | (empty) |
| `DODO_PRO_PRICE_ID` | Dodo Payments Pro plan price ID | (empty) |
| `DODO_STUDIO_PRICE_ID` | Dodo Payments Studio plan price ID | (empty) |
| `LAZYNEXT_WEBHOOK_URL` | External webhook URL | (empty) |

### Docker Secrets (managed via `docker secret`)

| Secret Name | Used By | Description |
|-------------|---------|-------------|
| `lazynext_postgres_password` | postgres | PostgreSQL password |
| `lazynext_better_auth_secret` | api-gateway, web, collab-server | Auth signing key |
| `lazynext_dodo_secret_key` | web | Dodo Payments secret key |
| `lazynext_dodo_webhook_secret` | api-gateway, web | Dodo Payments webhook key |
| `lazynext_resend_api_key` | web | Email API key |
| `lazynext_gemini_api_key` | ai-agents, pre-processing | Gemini API key |
| `lazynext_modal_key` | pre-processing, generative-studio | Modal API key |
| `lazynext_freesound_client_id` | web | Freesound client ID |
| `lazynext_freesound_api_key` | web | Freesound API key |
| `lazynext_marble_workspace_key` | web | Marble CMS workspace key |
| `lazynext_mcp_api_key` | api-gateway, web | MCP server API key |
| `lazynext_yt_client_secret` | social-publish | YouTube client secret |
| `lazynext_tiktok_client_secret` | social-publish | TikTok client secret |
| `lazynext_instagram_access_token` | social-publish | Instagram access token |
| `lazynext_twitter_api_secret` | social-publish | Twitter API secret |
| `lazynext_twitter_access_token` | social-publish | Twitter access token |
| `lazynext_twitter_access_secret` | social-publish | Twitter access secret |
| `cloudflare_api_token` | traefik | Cloudflare DNS API token |

### Loading Secrets

```bash
# Create all production secrets:
echo "${DB_PASSWORD}" | docker secret create lazynext_postgres_password -
echo "${BETTER_AUTH_SECRET}" | docker secret create lazynext_better_auth_secret -
echo "${DODO_SECRET_KEY}" | docker secret create lazynext_dodo_secret_key -
echo "${DODO_WEBHOOK_SECRET}" | docker secret create lazynext_dodo_webhook_secret -
echo "${RESEND_API_KEY}" | docker secret create lazynext_resend_api_key -
echo "${GEMINI_API_KEY}" | docker secret create lazynext_gemini_api_key -
echo "${MODAL_API_KEY}" | docker secret create lazynext_modal_key -
echo "${CF_DNS_API_TOKEN}" | docker secret create cloudflare_api_token -

# Verify secrets exist
docker secret ls
```

## 7. Monitoring URLs

| Dashboard | URL |
|-----------|-----|
| Platform Overview | `https://monitoring.lazynext.internal/grafana/d/lazynext-platform-overview` |
| AI Pipeline | `https://monitoring.lazynext.internal/grafana/d/lazynext-ai-pipeline` |
| Export Pipeline | `https://monitoring.lazynext.internal/grafana/d/lazynext-export-pipeline` |
| ML Inference | `https://monitoring.lazynext.internal/grafana/d/lazynext-ml` |
| Render Service | `https://monitoring.lazynext.internal/grafana/d/lazynext-render` |
| Infrastructure | `https://monitoring.lazynext.internal/grafana/d/lazynext-infra` |
| SLO | `https://monitoring.lazynext.internal/grafana/d/lazynext-slo` |
| Prometheus | `https://monitoring.lazynext.internal/prometheus` |
| AlertManager | `https://monitoring.lazynext.internal/alertmanager` |
| Traefik Dashboard | `https://traefik.lazynext.internal` |

## 8. Useful Commands Reference

```bash
# Check all service statuses
docker compose -f docker-compose.prod-full.yml ps

# Resource usage
docker stats --no-stream $(docker compose -f docker-compose.prod-full.yml ps -q)

# Disk usage
docker system df

# Prune old images (keep current)
docker image prune -a --filter "until=48h"

# Test rate limiting
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.lazynext.com/v1/health
done

# Test health endpoints
for port in 3000 8000 8001 8002 8003 8004 8005 8006 8007; do
  echo -n "Port $port: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health
  echo ""
done

# Validate docker-compose config
docker compose -f docker-compose.prod-full.yml config --quiet

# Check for host resource availability
free -h
df -h
nproc
```
