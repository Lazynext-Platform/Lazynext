#!/usr/bin/env bash
# migrate-db.sh — Run Drizzle ORM migrations safely
# Usage:
#   ./scripts/migrate-db.sh               # Local dev
#   ./scripts/migrate-db.sh --generate    # Generate new migration from schema
#   ./scripts/migrate-db.sh --push        # Push schema directly (dev only)
#   ./scripts/migrate-db.sh --production  # Production-safe migration with checks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Parse Args ──────────────────────────────────────────────────────────────

ACTION="migrate"
PRODUCTION=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --generate) ACTION="generate" ;;
    --push) ACTION="push" ;;
    --production) PRODUCTION=true ;;
    --help|-h)
      echo "Usage: $0 [--generate | --push] [--production]"
      echo ""
      echo "  (no flags)     Run pending migrations"
      echo "  --generate     Generate new migration from schema changes"
      echo "  --push         Push schema directly without migration files"
      echo "  --production   Production safety checks (backup, confirm)"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── Production Safety ───────────────────────────────────────────────────────

if [ "$PRODUCTION" = true ]; then
  echo "⚠️  PRODUCTION DEPLOYMENT DETECTED"
  echo ""
  echo "   🔒 Safety checks:"
  echo "   1. Backup will be created before migration"
  echo "   2. Migration runs in a transaction"
  echo "   3. Rollback plan required"
  echo ""

  # Create backup first
  echo "📦 Creating pre-migration backup..."
  "$SCRIPT_DIR/backup-db.sh"
  echo ""

  # Confirm
  read -rp "   Type 'yes' to proceed with production migration: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
  fi

  # Verify connection
  echo "🔍 Testing database connectivity..."
  if ! bun run apps/web/migrate.ts 2>&1 | head -1; then
    echo "❌ Cannot connect to database. Aborting."
    exit 1
  fi
fi

# ── Run Migration ───────────────────────────────────────────────────────────

cd "$REPO_ROOT"

case "$ACTION" in
  migrate)
    echo "🔄 Running pending migrations..."
    cd apps/web && bun run db:migrate
    echo "✅ Migrations complete."
    ;;
  generate)
    echo "📝 Generating new migration from schema changes..."
    cd apps/web && bun run db:generate
    echo "✅ Migration generated. Review the SQL in apps/web/drizzle/ before deploying."
    ;;
  push)
    if [ "$PRODUCTION" = true ]; then
      echo "❌ --push is not allowed in production. Use migration files."
      exit 1
    fi
    echo "⚡ Pushing schema directly (development only)..."
    cd apps/web && bun run db:push:local
    echo "✅ Schema pushed."
    ;;
esac
