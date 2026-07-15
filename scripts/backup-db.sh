#!/usr/bin/env bash
# backup-db.sh — PostgreSQL backup to local file
# Usage:
#   ./scripts/backup-db.sh                   # Local backup
#   ./scripts/backup-db.sh --remote           # Upload to remote storage
#   ./scripts/backup-db.sh --restore FILE    # Restore from backup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Config ──────────────────────────────────────────────────────────────────

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-lazynext}"
DB_NAME="${DB_NAME:-lazynext}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var}"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/.backups}"
MEDIA_DIR="${MEDIA_DIR:-/opt/lazynext/media}"
BACKUP_DIR="${MEDIA_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

export PGPASSWORD="$DB_PASSWORD"

# ── Parse Args ──────────────────────────────────────────────────────────────

ACTION="backup"
RESTORE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote) ACTION="backup-remote" ;;
    --restore) RESTORE_FILE="$2"; ACTION="restore"; shift ;;
    --help|-h)
      echo "Usage: $0 [--remote] [--restore FILE]"
      echo ""
      echo "  (no flags)       Create local pg_dump backup"
      echo "  --remote          Create backup and upload to remote storage"
      echo "  --restore FILE    Restore database from backup file"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── Backup ──────────────────────────────────────────────────────────────────

do_backup() {
  mkdir -p "$BACKUP_DIR"

  local backup_file="$BACKUP_DIR/lazynext_${TIMESTAMP}.sql.gz"

  echo "📦 Backing up PostgreSQL database..."
  echo "   Host: $DB_HOST:$DB_PORT  DB: $DB_NAME  User: $DB_USER"

  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | gzip > "$backup_file"

  local size
  size=$(du -h "$backup_file" | cut -f1)

  echo "✅ Backup complete: $backup_file ($size)"

  # Cleanup backups older than 30 days
  find "$BACKUP_DIR" -name "lazynext_*.sql.gz" -mtime +30 -delete
  echo "🧹 Cleaned up backups older than 30 days"

  echo "$backup_file"
}

# ── Restore ─────────────────────────────────────────────────────────────────

do_restore() {
  local restore_file="$1"

  if [ ! -f "$restore_file" ]; then
    echo "❌ Backup file not found: $restore_file"
    exit 1
  fi

  echo "⚠️  WARNING: This will DROP the existing database '$DB_NAME' and restore from backup."
  echo "   File: $restore_file"
  read -rp "   Type 'yes' to confirm: " confirm

  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
  fi

  echo "🔄 Dropping existing connections..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$DB_NAME'
      AND pid <> pg_backend_pid();
  " 2>/dev/null || true

  echo "🔄 Dropping and recreating database..."
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

  echo "🔄 Restoring from $restore_file..."
  gunzip -c "$restore_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

  echo "✅ Restore complete!"
}

# ── Main ────────────────────────────────────────────────────────────────────

case "$ACTION" in
  backup|backup-remote)
    do_backup
    ;;
  restore)
    do_restore "$RESTORE_FILE"
    ;;
esac
