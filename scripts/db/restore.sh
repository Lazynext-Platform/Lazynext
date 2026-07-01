#!/usr/bin/env bash
# restore.sh — Restore PostgreSQL database from local backup or Azure Blob
#
# Usage:
#   ./scripts/db/restore.sh ./backups/lazynext_20260628_030000.sql.gz       # Local file
#   ./scripts/db/restore.sh https://mystorage.blob.core.windows.net/media/backups/file.sql.gz  # Azure URL
#   ./scripts/db/restore.sh --point-in-time "2026-06-27 14:30:00"           # PITR (delegates to point-in-time-restore.sh)
#   ./scripts/db/restore.sh --latest                                        # Restore latest backup from Azure
#
# Features:
#   - Checksum validation (SHA-256)
#   - Connection draining before restore
#   - Drop + recreate database
#   - Restore with progress monitoring
#   - Run pending migrations after restore
#   - Verify data integrity (row counts, table structure)
#   - Dry-run mode
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ──────────────────────────────────────────────────────────────────

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-lazynext}"
DB_NAME="${DB_NAME:-lazynext}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var}"
PGPASSWORD="${DB_PASSWORD}"

AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-}"
AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-media}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/.backups}"
TEMP_DIR="${TEMP_DIR:-/tmp/lazynext-restore}"

export PGPASSWORD

# ── Color Helpers ────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

# ── Parse Args ──────────────────────────────────────────────────────────────

DRY_RUN=false
SKIP_MIGRATIONS=false
SKIP_VERIFY=false
RESTORE_SOURCE=""
PITR_TIMESTAMP=""
USE_LATEST=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run)
			DRY_RUN=true
			;;
		--skip-migrations)
			SKIP_MIGRATIONS=true
			;;
		--skip-verify)
			SKIP_VERIFY=true
			;;
		--point-in-time)
			PITR_TIMESTAMP="$2"
			shift
			;;
		--latest)
			USE_LATEST=true
			;;
		--help|-h)
			cat <<'EOF'
restore.sh — Restore Lazynext PostgreSQL from backup

Usage:
  restore.sh [OPTIONS] [BACKUP_FILE_OR_URL]

Options:
  --dry-run            Validate backup and plan restore without executing
  --skip-migrations    Skip running pending migrations after restore
  --skip-verify        Skip post-restore data integrity verification
  --point-in-time TS   Point-in-time restore (e.g. "2026-06-27 14:30:00")
  --latest             Restore latest backup from Azure Blob Storage
  --help, -h           Show this help

Environment:
  DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASSWORD
  AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_CONTAINER
EOF
			exit 0
			;;
		*)
			RESTORE_SOURCE="$1"
			;;
	esac
	shift
done

# ── Pre-flight Checks ───────────────────────────────────────────────────────

check_dependencies() {
	local missing=()
	for cmd in psql pg_dump dropdb createdb sha256sum gzip; do
		if ! command -v "$cmd" &>/dev/null; then
			missing+=("$cmd")
		fi
	done

	# sha256sum might be shasum -a 256 on macOS
	if [[ " ${missing[*]} " =~ " sha256sum " ]] && command -v shasum &>/dev/null; then
		missing=("${missing[@]/sha256sum/}")
	fi

	if [ ${#missing[@]} -gt 0 ]; then
		log_error "Missing required tools: ${missing[*]}"
		log_info "Install with: brew install ${missing[*]}" 2>/dev/null || true
		exit 1
	fi
}

compute_sha256() {
	local file="$1"
	if command -v sha256sum &>/dev/null; then
		sha256sum "$file" | cut -d' ' -f1
	elif command -v shasum &>/dev/null; then
		shasum -a 256 "$file" | cut -d' ' -f1
	else
		echo "unavailable"
	fi
}

# ── Source Acquisition ──────────────────────────────────────────────────────

acquire_backup() {
	local source="$1"
	local output="$2"

	if [[ "$source" =~ ^https?:// ]]; then
		log_info "Downloading backup from URL: $source"
		if command -v az &>/dev/null; then
			# Extract blob path from URL for az CLI download
			local account="${AZURE_STORAGE_ACCOUNT}"
			local container="${AZURE_STORAGE_CONTAINER}"
			local blob_name
			blob_name=$(echo "$source" | sed -n 's|.*/media/\(.*\)|\1|p')

			if [ -n "$account" ] && [ -n "$blob_name" ]; then
				az storage blob download \
					--account-name "$account" \
					--container-name "$container" \
					--name "$blob_name" \
					--file "$output" \
					--auth-mode login \
					--no-progress 2>/dev/null
			else
				# Fall back to curl
				curl -fSL --progress-bar -o "$output" "$source"
			fi
		else
			curl -fSL --progress-bar -o "$output" "$source"
		fi
		log_ok "Downloaded backup to $output"
	elif [[ "$source" =~ ^/ ]] || [[ "$source" =~ ^\. ]]; then
		# Local file path
		if [ ! -f "$source" ]; then
			log_error "Backup file not found: $source"
			exit 1
		fi
		cp "$source" "$output"
		log_ok "Copied local backup to $output"
	else
		log_error "Invalid source: $source (must be local path or https:// URL)"
		exit 1
	fi
}

find_latest_azure_backup() {
	if [ -z "$AZURE_STORAGE_ACCOUNT" ]; then
		log_error "AZURE_STORAGE_ACCOUNT must be set to use --latest"
		exit 1
	fi

	log_info "Finding latest backup in Azure Blob Storage..."
	local latest
	latest=$(az storage blob list \
		--account-name "$AZURE_STORAGE_ACCOUNT" \
		--container-name "$AZURE_STORAGE_CONTAINER" \
		--prefix "backups/lazynext_" \
		--query "sort_by([], &properties.lastModified)[-1].name" \
		--output tsv \
		--auth-mode login 2>/dev/null)

	if [ -z "$latest" ] || [ "$latest" = "None" ]; then
		log_error "No backups found in Azure Blob Storage"
		exit 1
	fi

	echo "https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}/${latest}"
}

# ── Backup Validation ───────────────────────────────────────────────────────

validate_backup() {
	local file="$1"

	log_info "Validating backup file: $(basename "$file")"

	# Check file exists and is non-empty
	if [ ! -s "$file" ]; then
		log_error "Backup file is empty or does not exist"
		return 1
	fi

	local size
	size=$(du -h "$file" | cut -f1)
	log_info "File size: $size"

	# Compute checksum
	local checksum
	checksum=$(compute_sha256 "$file")
	log_info "SHA-256: $checksum"

	# If there's a companion .sha256 file, verify
	local checksum_file="${file}.sha256"
	if [ -f "$checksum_file" ]; then
		local expected
		expected=$(cat "$checksum_file" | awk '{print $1}')
		if [ "$checksum" != "$expected" ]; then
			log_error "Checksum mismatch!"
			log_error "  Expected: $expected"
			log_error "  Got:      $checksum"
			return 1
		fi
		log_ok "Checksum verified against $checksum_file"
	fi

	# Check if it's a valid gzip file
	if gzip -t "$file" 2>/dev/null; then
		log_ok "Valid gzip archive"
	else
		log_error "File is not a valid gzip archive"
		return 1
	fi

	# Peek at first few lines to verify it's a pg_dump
	local header
	header=$(gunzip -c "$file" 2>/dev/null | head -20)
	if echo "$header" | grep -qi "PostgreSQL\|pg_dump\|CREATE\|INSERT\|COPY\|SET"; then
		log_ok "Content appears to be a valid PostgreSQL dump"
	else
		log_warn "Content does not look like a PostgreSQL dump — proceeding cautiously"
		log_warn "Header snippet:"
		echo "$header" | head -5
	fi

	log_ok "Backup validation passed"
}

# ── Connection Draining ─────────────────────────────────────────────────────

drain_connections() {
	log_info "Terminating active connections to '$DB_NAME'..."

	psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<-SQL 2>/dev/null || true
		SELECT pg_terminate_backend(pg_stat_activity.pid)
		FROM pg_stat_activity
		WHERE pg_stat_activity.datname = '$DB_NAME'
		  AND pid <> pg_backend_pid();
	SQL

	log_ok "Active connections terminated"
}

# ── Drop & Recreate ─────────────────────────────────────────────────────────

recreate_database() {
	log_info "Dropping database '$DB_NAME'..."
	dropdb --if-exists \
		-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
		"$DB_NAME" 2>/dev/null || log_warn "Database may not have existed"

	log_info "Creating fresh database '$DB_NAME'..."
	createdb \
		-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
		"$DB_NAME" -O "$DB_USER"

	log_ok "Database recreated"
}

# ── Restore ─────────────────────────────────────────────────────────────────

do_restore() {
	local backup_file="$1"

	log_info "Starting restore from $(basename "$backup_file")"
	local start_time
	start_time=$(date +%s)

	# Pipe through pv for progress if available
	if command -v pv &>/dev/null; then
		local file_size
		file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo 0)

		gunzip -c "$backup_file" | \
			pv -s "$file_size" -N "Restoring" | \
			psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
				--echo-errors \
				--set ON_ERROR_STOP=1
	else
		gunzip -c "$backup_file" | \
			psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
				--echo-errors \
				--set ON_ERROR_STOP=1
	fi

	local elapsed
	elapsed=$(($(date +%s) - start_time))
	log_ok "Restore completed in ${elapsed}s"
}

# ── Run Migrations ──────────────────────────────────────────────────────────

run_migrations() {
	log_info "Running pending Drizzle migrations..."

	cd "$REPO_ROOT/apps/web"
	if bun run db:migrate; then
		log_ok "Migrations applied successfully"
	else
		log_error "Migration failed! The database may be in an inconsistent state."
		return 1
	fi
	cd "$REPO_ROOT"
}

# ── Verify Integrity ────────────────────────────────────────────────────────

verify_integrity() {
	log_info "Verifying data integrity..."

	local issues=0

	# Row counts for all application tables
	log_info "Checking table row counts..."
	psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A <<-SQL
		SELECT '  ' || tablename || ': ' || n_live_tup::text || ' rows'
		FROM pg_stat_user_tables
		WHERE schemaname = 'public'
		ORDER BY n_live_tup DESC;
	SQL

	# Verify no orphaned foreign keys
	log_info "Checking for orphaned foreign keys..."
	local orphan_count
	orphan_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A <<-SQL 2>/dev/null
		SELECT COUNT(*) FROM "session" s
		LEFT JOIN "user" u ON s.user_id = u.id
		WHERE u.id IS NULL;
	SQL
	)
	if [ "${orphan_count:-0}" -gt 0 ]; then
		log_error "Found $orphan_count orphaned session records"
		issues=$((issues + 1))
	fi

	# Verify indexes exist
	log_info "Checking for missing indexes..."
	local index_count
	index_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A <<-SQL 2>/dev/null
		SELECT COUNT(*) FROM pg_indexes
		WHERE schemaname = 'public' AND tablename NOT LIKE 'pg%';
	SQL
	)
	log_info "Found $index_count indexes in public schema"

	# Check for invalid objects
	log_info "Checking for invalid database objects..."
	psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A <<-SQL 2>/dev/null
		SELECT '  WARNING: ' || relname || ' is invalid'
		FROM pg_class
		WHERE relkind = 'i' AND NOT relisvalid;
	SQL

	if [ "$issues" -gt 0 ]; then
		log_warn "Found $issues data integrity issue(s)"
		return 1
	fi

	log_ok "Data integrity verified — no issues found"
}

# ── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
	echo ""
	echo "=========================================="
	echo -e "  ${GREEN}Restore Summary${NC}"
	echo "=========================================="
	echo "  Database:    $DB_HOST:$DB_PORT/$DB_NAME"
	echo "  Timestamp:   $(date '+%Y-%m-%d %H:%M:%S')"
	echo "  Source:      $RESTORE_SOURCE"
	echo "=========================================="
	echo ""
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
	check_dependencies

	# Handle PITR delegation
	if [ -n "$PITR_TIMESTAMP" ]; then
		log_info "Delegating to point-in-time-restore.sh..."
		exec "$SCRIPT_DIR/point-in-time-restore.sh" "$PITR_TIMESTAMP"
	fi

	# Handle --latest
	if [ "$USE_LATEST" = true ]; then
		RESTORE_SOURCE=$(find_latest_azure_backup)
		log_info "Latest backup: $RESTORE_SOURCE"
	fi

	if [ -z "$RESTORE_SOURCE" ]; then
		log_error "No backup source specified."
		log_info "Usage: $0 [BACKUP_FILE_OR_URL]"
		log_info "  Use --help for more information."
		exit 1
	fi

	# ── Warning ──────────────────────────────────────────────────────────
	echo ""
	echo "╔══════════════════════════════════════════════════════════════════╗"
	echo "║  ⚠️   DATABASE RESTORE — DESTRUCTIVE OPERATION                   ║"
	echo "║                                                                  ║"
	echo "║  Target:  $DB_HOST:$DB_PORT/$DB_NAME"
	echo "║  Source:  $RESTORE_SOURCE"
	echo "║  This will DROP and RECREATE the database.                       ║"
	echo "║  All current data WILL BE LOST.                                  ║"
	echo "╚══════════════════════════════════════════════════════════════════╝"
	echo ""

	if [ "$DRY_RUN" = false ]; then
		read -rp "  Type 'restore-$DB_NAME' to confirm: " confirm
		if [ "$confirm" != "restore-$DB_NAME" ]; then
			log_error "Aborted by user."
			exit 1
		fi
	fi

	# ── Execute ──────────────────────────────────────────────────────────

	mkdir -p "$TEMP_DIR"
	local local_backup="$TEMP_DIR/restore_$(date +%Y%m%d_%H%M%S).sql.gz"

	# Acquire the backup locally
	acquire_backup "$RESTORE_SOURCE" "$local_backup"

	# Validate
	validate_backup "$local_backup"
	if [ $? -ne 0 ]; then
		log_error "Backup validation failed."
		rm -f "$local_backup"
		exit 1
	fi

	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN MODE — would restore from: $local_backup"
		log_ok "Dry run completed — no changes made."
		rm -f "$local_backup"
		exit 0
	fi

	# Drain connections
	drain_connections

	# Drop and recreate
	recreate_database

	# Restore
	do_restore "$local_backup"

	# Run migrations
	if [ "$SKIP_MIGRATIONS" = false ]; then
		run_migrations || log_warn "Migrations had issues — continuing"
	fi

	# Verify
	if [ "$SKIP_VERIFY" = false ]; then
		verify_integrity || log_warn "Integrity check found issues — review manually"
	fi

	# Cleanup
	rm -f "$local_backup"

	print_summary
	log_ok "Restore completed successfully!"
}

main "$@"
