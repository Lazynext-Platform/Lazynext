# Database — migrations, backups, connection config for Lazynext
#
# PostgreSQL 17+ is the primary database (Drizzle ORM for web app, sqlx for Rust services).
# Redis (Upstash) is used for session caching, rate limiting, and pub/sub.
#
# ── Quick Start ──────────────────────────────────────────────────
#   docker compose up -d db redis
#   bun run db:generate && bun run db:migrate
#   bash scripts/migrate-db.sh --push
#
# ── Backup / Restore ─────────────────────────────────────────────
#   bash scripts/backup-db.sh
#   bash scripts/db/restore.sh <backup-file>
#   bash scripts/db/point-in-time-restore.sh  # Azure PITR
#
# ── Connection Strings (Development — Docker Compose) ────────────
# PostgreSQL: postgresql://lazynext:changeme@localhost:5434/lazynext
# Redis:      redis://localhost:6379
#
# ── Connection Strings (Production — Azure) ──────────────────────
# PostgreSQL: postgresql://lazynext_app:<password>@lazynext-postgres-dev.postgres.database.azure.com:5432/lazynext?sslmode=require
# Redis:      rediss://:<token>@<upstash-endpoint>:6379
#
# ── Migration Architecture ───────────────────────────────────────
# Drizzle ORM (apps/web/drizzle/):
#   - schema/           — Table definitions (users, projects, subscriptions)
#   - migrations/       — 31 sequential SQL migration files
#   - drizzle.config.ts — Connection config
#
# Rust sqlx (services/collab-server/src/db.rs):
#   - collab_states     — JSONB CRDT state persistence
#   - Auto-creates table on startup
#
# ── Migration Commands ───────────────────────────────────────────
#   bun run db:generate     # Generate SQL from Drizzle schema
#   bun run db:migrate      # Apply pending migrations
#   bun run db:push         # Push schema directly (dev only)
#   bash scripts/migrate-db.sh --plan    # Preview migrations
#   bash scripts/migrate-db.sh --apply   # Apply to production
#
# ── Seed Data ────────────────────────────────────────────────────
#   bash scripts/db/seed-analytics.sh    # Test analytics events
#
# ── Monitoring ───────────────────────────────────────────────────
#   - Database size/utilization alerts in monitoring/prometheus/alerts/database.yml
#   - Backup verification via .github/workflows/backup-verify.yml
#   - Connection pool metrics via PgBouncer (k8s/pgbouncer.yaml)
