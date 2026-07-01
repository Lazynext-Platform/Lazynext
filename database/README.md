# Database — migrations, backups, and connection config for Lazynext
#
# PostgreSQL 17+ is the primary database (Drizzle ORM for web app, sqlx for Rust services).
# Redis is used for session caching, rate limiting, and pub/sub via Upstash-compatible API.
#
# Quick start:
#   docker compose up -d db redis
#   bun run db:generate && bun run db:migrate
#   bash scripts/migrate-db.sh --push
#
# Backup/Restore:
#   bash scripts/backup-db.sh
#   bash scripts/db/restore.sh <backup-file>
#
# Migration scripts live in apps/web/drizzle/ (Drizzle ORM schema + migrations).

# Connection strings for development (Docker Compose)
# PostgreSQL: postgresql://lazynext:changeme@localhost:5434/lazynext
# Redis:      redis://localhost:6379
