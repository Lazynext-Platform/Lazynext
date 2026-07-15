# Scripts

Utility and operational scripts for the Lazynext platform.

## Infrastructure & Deployment

| Script | Description |
|---|---|
| `deploy-prod.sh` | Production deploy — builds, pushes to GHCR, deploys to Linode. |
| `docker-build.sh` | Build and push all 9 Docker service images (local or GHCR). Supports `--push`, `--gpu`, parallel builds. |
| `setup-gpu-operator.sh` | Install NVIDIA GPU Operator on LKE for GPU scheduling, DCGM monitoring, and MIG support. |
| `farm_deploy.sh` | Compile and distribute the Rust CLI daemon across a 5-node headless render farm. |

## Database

| Script | Description |
|---|---|
| `db-setup.sql` | PostgreSQL initial setup — extensions, application roles, schema grants, performance tuning. |
| `migrate-db.sh` | Run Drizzle ORM migrations (`--generate`, `--push`, `--production`). |
| `backup-db.sh` | Local or remote PostgreSQL backup (`--remote`, `--restore`). |
| `redis-prod.conf` | Redis 7.x production configuration (persistence, memory, replication, security). |
| `pgbouncer.ini` | PgBouncer connection pooler configuration for PostgreSQL. |
| `pgbouncer-userlist.txt` | PgBouncer auth credentials mapping. |
| `db/connection-test.sh` | Comprehensive PostgreSQL connection diagnostics (direct, PgBouncer, SSL, replication lag). |
| `db/restore.sh` | Restore PostgreSQL from local backup, remote URL, or `--latest` backup. |
| `db/point-in-time-restore.sh` | PostgreSQL Point-In-Time Restore (PITR) from backup to primary. |
| `db/seed-analytics.sh` | Generate test data for analytics tables (users, sessions, events, A/B experiments, audit logs). |

## Security & Secrets

| Script | Description |
|---|---|
| `rotate-secrets.sh` | Rotate database passwords and API keys (`--db`, `--api-keys`, `--all`). |
| `scan-images.sh` | Vulnerability scan Docker images with Trivy (CRITICAL/HIGH severity). |
| `sign-images.sh` | Sign Docker images with Cosign (keyless via GitHub OIDC) and attach SBOMs. |

## AI & ML

| Script | Description |
|---|---|
| `download-sam2-models.sh` | Download SAM2 ONNX model files (~480 MB) for real AI segmentation. |
| `export-model.sh` | Export Modal-managed models (Whisper, SAM2, Real-ESRGAN, MobileNet, EfficientNet) to TensorFlow SavedModel. |
| `tf-model-download.sh` | Download TensorFlow Serving models with checksum verification, retries, and Modal fallback. |
| `generate-kotlin-bindings.sh` | Generate UniFFI Kotlin bindings for Android from Rust UDL definitions. |
| `batch-render.yaml` | CLI batch render manifest — define multiple export projects with format, resolution, framerate overrides. |

## Testing & Quality

| Script | Description |
|---|---|
| `full-e2e.sh` | Full end-to-end integration test — ingest, transcribe, AI edit, render, validate. |
| `health-check.sh` | Check health of all 7 Lazynext services (`--watch`, `--json`). |
| `load-test.js` | K6 load test against all endpoints (health, CRUD, AI edit, render, MCP, ingest) with SLO thresholds. |
| `test-signup.ts` | Test the sign-up API flow against a running dev server. |

## Maintenance

| Script | Description |
|---|---|
| `clean_attributions.py` | Legacy attribution cleanup script (v1). Prefer `clean_attributions_v2.py`. |
| `clean_attributions_v2.py` | Normalize Lazynext-Corporation attribution patterns and GitHub URLs in source files. |
| `fix-theme-colors.js` | Batch-replace hardcoded Tailwind color classes with semantic theme tokens in the web app. |
| `seed-templates.ts` | Insert default project templates (YouTube Vlogger, TikTok Viral Hook) into the database. |

## Toolchain Setup

| Script | Description |
|---|---|
| `setup-rust` | Install Rust toolchain via rustup (macOS/Linux). |
| `setup-rust.ps1` | Install Rust toolchain via rustup (Windows PowerShell). |

## Python Modules

| Path | Description |
|---|---|
| `python/app.py` | Pre-processing API v1 — FastAPI service for Whisper transcription and auto-editing. |
| `python/main.py` | Pre-processing API v2 — FastAPI service for auto-editor silence removal via Lazynext-Editor CLI. |
| `python/requirements.txt` | Python dependencies for the pre-processing services. |
| `python/auto-editor/` | Lazynext-Editor Nimble module (silence detection and trimming). |
| `python/clip-anything/` | CLIP-Anything module (CLIP-based video segmentation). |
| `python/funclip/` | FunClip module placeholder. |
