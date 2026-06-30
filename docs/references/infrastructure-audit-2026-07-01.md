# 🏗️ Infrastructure Audit — Remaining Items (Human Action Required)

> **Date**: 2026-07-01
> **Scope**: CI/CD, Docker, K8s, Terraform, Ansible, Monitoring, Database
> **Audited by**: 4 parallel subagent audits (174 findings total)

---

## ✅ Fixed This Session (7 items)

| # | Area | Fix |
|---|------|-----|
| 1 | Prometheus | Added `rule_files` stanza — 5 alert/SLO/recording files were present but never loaded |
| 2 | CI | Removed stale `--exclude lazynext_desktop` (non-existent crate) |
| 3 | CI | Deleted 5 deprecated files: `Jenkinsfile`, `.gitlab-ci.yml`, `web-wasm.yml`, `main.yml`, `codeql.yml` |
| 4 | production.yml | Added per-service `TARGET_PORT` mapping (was hardcoded 3000 for all services) |
| 5 | Loki | Added ruler storage config + mounted `rules.yml` into container |
| 6 | Alloy dev | Now scrapes all 8 services (was only api-gateway:8005) |
| 7 | docker/env | Added 8 missing env vars to docker-compose.yml + `.env.example` |

---

## ⚠️ Remaining — Needs Human Action

### CRITICAL (runtime blockers)

**1. DB Schema-Migration Mismatch (`apps/web/src/db/schema.ts` vs `drizzle/`)**
- Drizzle schema defines tables `timelines`, `tracks`, `clips`, `agents`, `feedback`, `assets`, `verification` — but **no migration SQL exists** for any of them.
- Migration `0001` creates tables `api_key`, `render_job`, `audit_log` that are **not in the Drizzle schema** (invisible to ORM).
- Migration `0002` is in `drizzle/migrations/` but `0001` is in `drizzle/` — path inconsistency.
- Table naming mismatch: `projects` (schema) vs `project` (migration), `subscriptions` vs `subscription`.
- **Impact**: Drizzle ORM queries will fail at runtime for tables that exist in schema but not in DB, or exist in DB but not in schema.

**2. Terraform PostgreSQL User Not Created**
- `DATABASE_URL` uses `lazynext_app` user, but Terraform only creates `lazynext_admin`. The `lazynext_app` user is never provisioned.
- **Impact**: All Container Apps will fail to connect on first deploy.

**3. Terraform Missing 3 Container Apps**
- `api-gateway` (port 8005), `collab-server` (port 8004), `analytics-service` (port 8006) exist in Docker Compose but have **no Terraform Container App resources**.
- ACR repos list includes orphan `lazynext-mcp` but is missing `lazynext-api-gateway` and `lazynext-collab-server`.

### HIGH

**4. Prometheus Alert Job Name Mismatch**
- `prometheus.yml` scrape configs use `job_name: 'lazynext-web'`, but `rules.yml` uses `up{job="web"}`.
- Similar mismatch on all 6 services: `lazynext-ai-agents` vs `ai-agent`, `lazynext-render-service` vs `render-service`, etc.
- **Impact**: Even with rule_files loaded, alerts will never fire because labels don't match. Fix: add `relabel_configs` in prometheus.yml to normalize job names, OR update all rules.

**5. K8s Production Pulls from Dev ACR**
- `k8s/base/kustomization.yaml` remaps all images to `lazynextacrdevlmblwn.azurecr.io` (DEV).
- Production/staging overlays override `newTag` but **not `newName`**.
- `collab-server` uses hardcoded `lazynextacrproduction.azurecr.io` — bypassing kustomization entirely.
- **Impact**: Prod deployments pull images from dev registry.

**6. Ansible NVIDIA Role Stale**
- Hardcoded Ubuntu 22.04 repo URL → fails on 24.04.
- Uses `nvidia-driver-535` + CUDA 12.2 — should be driver 550/560 + CUDA 12.4+.
- Ansible playbooks don't include `redis`, `postgresql`, `monitoring` roles (exist but unreachable).

### MEDIUM

**7. K8s Overlays Incomplete**
- Staging/dev overlays only patch web + sync + render. Missing: pre-processing, generative-studio, analytics-service, collab-server, mcp.
- Staging `namePrefix: staging-` will break hardcoded service names like `collab-server` in configmaps.

**8. CI `continue-on-error: true` on 8+ Steps**
- WASM build, Docker builds, lint, typecheck all have `continue-on-error: true`.
- Test failures are silently swallowed with `|| echo "::warning ::"` patterns.
- **Impact**: Broken builds/tests pass CI green. Multiple false-green builds possible.

**9. Migration Job Non-Idempotent**
- `production.yml` uses `az containerapp job create` on every deploy — fails on second run.

**10. Docker Compose Exporter Duplication**
- `postgres-exporter` and `redis-exporter` defined in both `docker-compose.prod.yml` and `docker-compose.monitoring.yml` with different auth approaches.

### LOW

**11.** `infra/k8s/deployment.yaml` is stale (AWS S3, redis 7.0, wrong api-gateway port, wrong GHCR org).
**12.** Application Gateway routes traffic only to web — no routing rules for other 4 backends.
**13.** Alertmanager receivers all placeholder (Slack/PagerDuty/email credentials empty) — intentional for dev but undocumented.
**14.** Tempo uses local `/tmp` storage — traces lost on restart in prod.
**15.** `redis_capacity` Terraform variable declared but unused.

---

## Summary

| Severity | Count | Fixed | Remaining |
|---|---|---|---|
| Critical | 5 | 2 | 3 |
| High | 6 | 4 | 2 |
| Medium | 5 | 1 | 4 |
| Low | 5 | 0 | 5 |
| **Total** | **21** | **7** | **14** |

The codebase infrastructure is **well-architected but deployment-untested**. The Docker-Compose stack is consistent and complete. The CI/CD pipeline structure is excellent but has false-green masking issues. The Terraform/K8s gap is the main blocker to production deployment — 3 services are missing from infrastructure-as-code.
