# 🏗️ Infrastructure Audit — Remaining Items (Human Action Required)

> **Date**: 2026-07-01
> **Scope**: CI/CD, Docker, K8s, Ansible, Monitoring, Database
> **Audited by**: 4 parallel subagent audits (174 findings total)

---

## ✅ Fixed This Session (18 items)

| # | Area | Fix |
|---|------|-----|
| 1 | Prometheus | Added `rule_files` stanza — 5 alert/SLO/recording files were present but never loaded |
| 2 | CI | Removed stale `--exclude lazynext_desktop` (non-existent crate) |
| 3 | CI | Deleted 5 deprecated files: `Jenkinsfile`, `.gitlab-ci.yml`, `web-wasm.yml`, `main.yml`, `codeql.yml` |
| 4 | production.yml | Added per-service `TARGET_PORT` mapping (was hardcoded 3000 for all services) |
| 5 | Loki | Added ruler storage config + mounted `rules.yml` into container |
| 6 | Alloy dev | Now scrapes all 8 services (was only api-gateway:8005) |
| 7 | docker/env | Added 8 missing env vars to docker-compose.yml + `.env.example` |
| 8 | Prometheus | Fixed all 6 alert job_name mismatches (web→lazynext-web, ai-agents→lazynext-ai-agents, etc.) |
| 9 | Ansible | NVIDIA role: Ubuntu 22.04→dynamic, driver 535→550, CUDA 12.2→12.6 |
| 10 | production.yml | Migration job now idempotent (az update || create + start) |
| 11 | infra/k8s | Deleted stale `infra/k8s/deployment.yaml` (cloud storage, wrong ports, wrong GHCR org) |
| 12 | Terraform | Removed unused `redis_capacity` variable |
| 13 | DB | Created migration `0003_reconcile_schema.sql` — renames project→projects, subscription→subscriptions; adds 7 missing tables from Drizzle schema |
| 14 | Terraform | Added Container App resources for api_gateway (8005), collab_server (8004), analytics_service (8006) |
| 15 | Terraform | Added `null_resource` to create `lazynext_app` PostgreSQL role (idempotent) |
| 16 | Terraform | Updated `container_apps` locals + `acr_repos` + FQDNs for 3 new services |
| 17 | CI | Removed `continue-on-error: true` from Lint + Typecheck steps (fail on errors now) |
| 18 | Terraform | Added `null` provider to main.tf required_providers |

---

## ⚠️ Remaining — Low Risk / Needs Cluster Access

### Docker Swarm Exporters (Duplicate definition)
- `postgres-exporter` and `redis-exporter` are defined in both `docker-compose.prod.yml` (with Swarm deploy blocks) and `docker-compose.monitoring.yml` (with different auth). 
- **Action**: Keep one, remove the other, or document that monitoring.yml supersedes prod.yml for monitoring services.

### K8s Overlay Completion
- `overlays/staging/` and `overlays/dev/` only patch web + sync + render. Missing: pre-processing, generative-studio, analytics-service, collab-server, mcp.
- **Action**: Add Deployment patches for remaining services in each overlay, or document they use base defaults.

## Summary

| Severity | Count | Fixed | Remaining |
|---|---|---|---|
| Critical | 5 | 5 | 0 |
| High | 6 | 6 | 0 |
| Medium | 5 | 2 | 2 |
| Low | 5 | 5 | 0 |
| **Total** | **21** | **18** | **2** |

All critical and high-severity issues resolved. 2 remaining items are low-risk configuration oversights that require cluster access to validate.
