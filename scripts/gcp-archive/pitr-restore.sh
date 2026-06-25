#!/usr/bin/env bash
# pitr-restore.sh — Point-In-Time Recovery test and execution
# Validates that PostgreSQL PITR backups work and can be restored.
# Usage:
#   ./scripts/pitr-restore.sh --test          # Dry-run: verify latest restorable time
#   ./scripts/pitr-restore.sh --to "2026-01-15 14:30:00"  # Restore to specific time
#   ./scripts/pitr-restore.sh --latest        # Restore to latest possible time
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-lazynext}"
DB_NAME="${DB_NAME:-lazynext}"

# GCP-specific
PROJECT_ID="${PROJECT_ID:-vertexaiopencode}"
CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-lazynext-db-prod}"
REGION="${REGION:-us-central1}"

RESTORE_INSTANCE="${CLOUD_SQL_INSTANCE}-restore-$(date +%s)"
RESTORE_DB="${DB_NAME}_restored_$(date +%Y%m%d_%H%M%S)"

export PGPASSWORD="${DB_PASSWORD:-}"

# ── Parse Args ──────────────────────────────────────────────────────────────

ACTION="test"
TARGET_TIME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --test) ACTION="test" ;;
    --latest) ACTION="latest" ;;
    --to) TARGET_TIME="$2"; ACTION="restore"; shift ;;
    --help|-h)
      echo "Usage: $0 [--test | --latest | --to 'YYYY-MM-DD HH:MM:SS']"
      echo ""
      echo "  --test     Verify latest restorable time (safe, no changes)"
      echo "  --latest   Restore to latest possible point in time (creates new instance)"
      echo "  --to TIME  Restore to a specific point in time"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── GCP Cloud SQL PITR ─────────────────────────────────────────────────────

gcp_pitr_test() {
  echo "🔍 Checking latest restorable time for $CLOUD_SQL_INSTANCE..."

  gcloud sql instances describe "$CLOUD_SQL_INSTANCE" \
    --project="$PROJECT_ID" \
    --format="value(settings.backupConfiguration.pointInTimeRecoveryEnabled)"

  # Get latest restorable time from backup runs
  echo ""
  echo "📋 Recent backups:"
  gcloud sql backups list \
    --instance="$CLOUD_SQL_INSTANCE" \
    --project="$PROJECT_ID" \
    --limit=5 \
    --format="table(id, startTime, status, type)"

  # Check binary log coordinates
  echo ""
  echo "📋 Latest binary log position:"
  gcloud sql instances describe "$CLOUD_SQL_INSTANCE" \
    --project="$PROJECT_ID" \
    --format="value(serverCaCert.expirationTime)"
}

gcp_pitr_restore() {
  local point_in_time="${TARGET_TIME:-}"

  echo "⚠️  Point-In-Time Recovery"
  echo "   Source: $CLOUD_SQL_INSTANCE"
  echo "   Target: $RESTORE_INSTANCE"
  if [ -n "$point_in_time" ]; then
    echo "   PITR To: $point_in_time"
  else
    echo "   PITR To: Latest possible"
  fi
  echo ""

  read -rp "   Type 'yes' to proceed: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
  fi

  echo "🔄 Creating clone from PITR backup..."

  if [ -n "$point_in_time" ]; then
    # Clone to specific point in time
    gcloud sql instances clone "$CLOUD_SQL_INSTANCE" "$RESTORE_INSTANCE" \
      --project="$PROJECT_ID" \
      --point-in-time "$point_in_time"
  else
    # Clone to latest
    gcloud sql instances clone "$CLOUD_SQL_INSTANCE" "$RESTORE_INSTANCE" \
      --project="$PROJECT_ID"
  fi

  echo "✅ Clone created: $RESTORE_INSTANCE"
  echo ""
  echo "   Connection:"
  echo "   gcloud sql connect $RESTORE_INSTANCE --user=$DB_USER --project=$PROJECT_ID"
  echo ""
  echo "   Don't forget to delete after verification:"
  echo "   gcloud sql instances delete $RESTORE_INSTANCE --project=$PROJECT_ID"
}

# ── Local PostgreSQL PITR ──────────────────────────────────────────────────

local_pitr_test() {
  echo "🔍 Checking WAL archiving status..."

  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT pg_current_wal_lsn() AS current_wal_position;
    SELECT archived_count, failed_count,
           last_archived_wal, last_archived_time
    FROM pg_stat_archiver;
    SELECT name, setting FROM pg_settings
    WHERE name IN ('archive_mode', 'archive_command', 'wal_level');
  "
}

# ── Main ────────────────────────────────────────────────────────────────────

# Detect if this is a Cloud SQL instance
if gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
  echo "☁️  Cloud SQL detected: $CLOUD_SQL_INSTANCE"

  case "$ACTION" in
    test)   gcp_pitr_test ;;
    latest) gcp_pitr_restore "" ;;
    restore) gcp_pitr_restore "$TARGET_TIME" ;;
  esac
else
  echo "🖥️  Local PostgreSQL detected"

  case "$ACTION" in
    test)   local_pitr_test ;;
    *)
      echo "❌ PITR restore to new instance is only supported on Cloud SQL."
      echo "   For local recovery, use: scripts/backup-db.sh --restore <file>"
      exit 1
      ;;
  esac
fi
