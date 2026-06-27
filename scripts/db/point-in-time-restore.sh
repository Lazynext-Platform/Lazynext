#!/usr/bin/env bash
# point-in-time-restore.sh — Azure PostgreSQL Point-In-Time Restore (PITR)
#
# Usage:
#   ./scripts/db/point-in-time-restore.sh "2026-06-27 14:30:00"
#   ./scripts/db/point-in-time-restore.sh --restore-time "2026-06-27 14:30:00" --no-cleanup
#
# Workflow:
#   1. Validate the restore timestamp
#   2. Create a new temporary Azure PostgreSQL Flexible Server from the backup
#   3. Wait for the temp server to become available
#   4. Dump data from the temp server
#   5. Restore into the primary server
#   6. Verify data consistency
#   7. Clean up the temporary server
#
# Prerequisites:
#   - Azure CLI (az) installed and logged in
#   - jq installed
#   - PITR enabled on the source server (Azure PostgreSQL Flexible Server feature)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Config ──────────────────────────────────────────────────────────────────

# Source (primary) server
SOURCE_SERVER="${AZURE_PG_SERVER:-lazynext-postgres}"
SOURCE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-lazynext-rg}"
SOURCE_SUBSCRIPTION="${AZURE_SUBSCRIPTION:-}"

# Temporary restore server
TEMP_SERVER_NAME="${TEMP_SERVER_NAME:-lazynext-pitr-temp}"
TEMP_SERVER_SKU="${PITR_SKU:-Standard_B1ms}"       # Burstable for cost efficiency
TEMP_SERVER_TIER="${PITR_TIER:-Burstable}"
TEMP_SERVER_STORAGE="${PITR_STORAGE:-32}"            # GB

# Database connection
DB_NAME="${DB_NAME:-lazynext}"
DB_USER="${DB_USER:-lazynext}"
DB_PASSWORD="${DB_PASSWORD:-}"
PGPASSWORD="${DB_PASSWORD}"

# Timeouts
SERVER_CREATE_TIMEOUT="${PITR_CREATE_TIMEOUT:-1200}"  # 20 minutes
DUMP_TIMEOUT="${PITR_DUMP_TIMEOUT:-600}"               # 10 minutes

export PGPASSWORD

# ── Color Helpers ────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

# ── Parse Args ──────────────────────────────────────────────────────────────

RESTORE_TIME=""
NO_CLEANUP=false
DRY_RUN=false
TARGET_DATABASE="$DB_NAME"

while [[ $# -gt 0 ]]; do
	case "$1" in
		--restore-time)
			RESTORE_TIME="$2"
			shift
			;;
		--no-cleanup)
			NO_CLEANUP=true
			;;
		--dry-run)
			DRY_RUN=true
			;;
		--target-database)
			TARGET_DATABASE="$2"
			shift
			;;
		--subscription)
			SOURCE_SUBSCRIPTION="$2"
			shift
			;;
		--help|-h)
			cat <<'EOF'
point-in-time-restore.sh — Azure PostgreSQL PITR Restore

Usage:
  point-in-time-restore.sh [OPTIONS] [TIMESTAMP]

  TIMESTAMP is parsed as the restore point. Accepts formats:
    "2026-06-27 14:30:00"
    "2026-06-27T14:30:00Z"
    "2026-06-27 14:30:00+00:00"

Options:
  --restore-time TS    Explicit restore timestamp
  --no-cleanup         Keep the temporary server after restore
  --dry-run            Validate parameters without executing
  --target-database    Database name to restore into (default: lazynext)
  --subscription       Azure subscription ID

Environment:
  AZURE_PG_SERVER           Source PostgreSQL server name
  AZURE_RESOURCE_GROUP      Azure resource group
  AZURE_SUBSCRIPTION        Azure subscription ID
  DB_NAME, DB_USER, DB_PASSWORD
EOF
			exit 0
			;;
		*)
			if [ -z "$RESTORE_TIME" ]; then
				RESTORE_TIME="$1"
			fi
			;;
	esac
	shift
done

# ── Pre-flight ──────────────────────────────────────────────────────────────

check_dependencies() {
	local missing=()
	for cmd in az jq psql pg_dump createdb; do
		if ! command -v "$cmd" &>/dev/null; then
			missing+=("$cmd")
		fi
	done
	if [ ${#missing[@]} -gt 0 ]; then
		log_error "Missing required tools: ${missing[*]}"
		exit 1
	fi
}

validate_timestamp() {
	local ts="$1"
	log_info "Validating restore timestamp: $ts"

	# Try to parse the timestamp
	if date -d "$ts" &>/dev/null 2>&1; then
		local parsed
		parsed=$(date -d "$ts" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
		log_ok "Valid timestamp: $parsed (UTC)"
	else
		# Try macOS date
		if date -j -f "%Y-%m-%d %H:%M:%S" "$ts" +"%Y-%m-%dT%H:%M:%SZ" &>/dev/null 2>&1; then
			parsed=$(date -j -f "%Y-%m-%d %H:%M:%S" "$ts" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)
			log_ok "Valid timestamp: $parsed (UTC)"
		else
			log_error "Cannot parse timestamp: $ts"
			log_info "Expected formats: 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DDTHH:MM:SSZ'"
			exit 1
		fi
	fi

	# Ensure it's not in the future
	local now
	now=$(date -u +%s)
	local restore_epoch
	restore_epoch=$(date -d "$ts" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$ts" +%s 2>/dev/null)

	if [ "${restore_epoch:-0}" -gt "$now" ]; then
		log_error "Restore timestamp is in the future!"
		exit 1
	fi

	# Check it's within retention period (Azure PITR default: 7 days)
	local max_age_days=7
	local age_seconds=$((now - restore_epoch))
	local age_days=$((age_seconds / 86400))

	if [ "$age_days" -gt "$max_age_days" ]; then
		log_warn "Restore point is ${age_days} days old. Azure PITR retention is typically ${max_age_days} days."
		log_warn "If configured retention is longer, this will still work."
	fi

	# Return the parsed timestamp in ISO 8601 format
	echo "$parsed"
}

verify_azure_login() {
	log_info "Verifying Azure authentication..."
	if ! az account show &>/dev/null; then
		log_error "Not logged into Azure CLI. Run 'az login' first."
		exit 1
	fi

	local sub
	sub=$(az account show --query "name" -o tsv 2>/dev/null)
	log_ok "Authenticated to Azure: $sub"

	if [ -n "$SOURCE_SUBSCRIPTION" ]; then
		log_info "Setting subscription: $SOURCE_SUBSCRIPTION"
		az account set --subscription "$SOURCE_SUBSCRIPTION"
	fi
}

verify_source_server() {
	log_info "Verifying source server '$SOURCE_SERVER' exists..."

	local server
	server=$(az postgres flexible-server show \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$SOURCE_SERVER" \
		--query "{name:name, state:state, version:version, sku:sku.name}" \
		-o json 2>/dev/null) || {
		log_error "Source server '$SOURCE_SERVER' not found in resource group '$SOURCE_RESOURCE_GROUP'"
		exit 1
	}

	log_ok "Source server: $(echo "$server" | jq -r '.name') ($(echo "$server" | jq -r '.state'))"
	log_info "  Version: $(echo "$server" | jq -r '.version')"
	log_info "  SKU:     $(echo "$server" | jq -r '.sku')"

	# Get the server's region
	local region
	region=$(az postgres flexible-server show \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$SOURCE_SERVER" \
		--query "location" -o tsv 2>/dev/null)
	echo "$region"
}

# ── Create Temp Server from PITR ────────────────────────────────────────────

create_pitr_server() {
	local restore_time="$1"
	local source_region="$2"

	local temp_server_name="${TEMP_SERVER_NAME}-$(date +%Y%m%d%H%M%S)"

	log_info "Creating PITR restore server: $temp_server_name"
	log_info "  Restore point: $restore_time"
	log_info "  Region:        $source_region"
	log_info "  SKU:           $TEMP_SERVER_SKU ($TEMP_SERVER_TIER)"
	log_info "  This may take 10-20 minutes..."

	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN: Would create server '$temp_server_name'"
		echo "$temp_server_name"
		return
	fi

	# Create the temporary server
	# Note: PITR restore creates a NEW server from the backup at the specified point in time
	az postgres flexible-server restore \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$temp_server_name" \
		--source-server "$SOURCE_SERVER" \
		--restore-time "$restore_time" \
		--yes \
		--only-show-errors 2>&1 | while IFS= read -r line; do
			log_info "  Azure: $line"
		done

	local restore_status=$?
	if [ $restore_status -ne 0 ]; then
		log_error "Failed to create PITR restore server"
		exit 1
	fi

	log_ok "PITR server creation initiated: $temp_server_name"
	echo "$temp_server_name"
}

wait_for_server() {
	local server_name="$1"
	local timeout="${2:-$SERVER_CREATE_TIMEOUT}"
	local interval=30
	local elapsed=0

	log_info "Waiting for server '$server_name' to become ready..."

	while [ $elapsed -lt $timeout ]; do
		local state
		state=$(az postgres flexible-server show \
			--resource-group "$SOURCE_RESOURCE_GROUP" \
			--name "$server_name" \
			--query "state" -o tsv 2>/dev/null || echo "Unknown")

		case "$state" in
			Ready)
				log_ok "Server is ready (waited ${elapsed}s)"
				return 0
				;;
			Updating|Creating|Restoring)
				log_info "  State: $state (${elapsed}s elapsed)..."
				;;
			*)
				log_error "Unexpected server state: $state"
				return 1
				;;
		esac

		sleep $interval
		elapsed=$((elapsed + interval))
	done

	log_error "Server did not become ready within ${timeout}s"
	return 1
}

# ── Allow Firewall Access ───────────────────────────────────────────────────

allow_temp_firewall() {
	local server_name="$1"

	# Get current public IP
	local my_ip
	my_ip=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || curl -s --max-time 5 https://ipinfo.io/ip 2>/dev/null || echo "")

	if [ -z "$my_ip" ]; then
		log_warn "Cannot determine public IP — skipping firewall rule"
		return 1
	fi

	log_info "Adding temporary firewall rule for IP: $my_ip"

	az postgres flexible-server firewall-rule create \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$server_name" \
		--rule-name "pitr-restore-temp" \
		--start-ip-address "$my_ip" \
		--end-ip-address "$my_ip" \
		--only-show-errors 2>/dev/null || {
		log_warn "Failed to add firewall rule — may already exist or have network restrictions"
	}

	log_ok "Firewall rule added for $my_ip"
}

# ── Dump from Temp Server ───────────────────────────────────────────────────

dump_from_temp() {
	local server_name="$1"
	local dump_file="$2"

	# Get the FQDN of the temp server
	local fqdn
	fqdn=$(az postgres flexible-server show \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$server_name" \
		--query "fullyQualifiedDomainName" -o tsv 2>/dev/null)

	log_info "Dumping database from temp server: $fqdn"

	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN: Would dump from $fqdn to $dump_file"
		return
	fi

	# We need the admin password. Try to fetch from Azure or use env var.
	local admin_user="${PITR_ADMIN_USER:-lazynext}"
	local admin_pass="${DB_PASSWORD}"

	if [ -z "$admin_pass" ]; then
		log_error "DB_PASSWORD not set. Cannot connect to temp server."
		log_info "Set DB_PASSWORD or ensure the env var is available."
		exit 1
	fi

	PGPASSWORD="$admin_pass" pg_dump \
		-h "$fqdn" \
		-p 5432 \
		-U "$admin_user" \
		-d "$DB_NAME" \
		--no-owner \
		--no-acl \
		--verbose \
		--format=custom \
		--file="$dump_file" \
		--no-password 2>&1 | while IFS= read -r line; do
			log_info "  pg_dump: $line"
		done

	local dump_status=$?
	if [ $dump_status -ne 0 ]; then
		log_error "pg_dump from temp server failed"
		return 1
	fi

	local size
	size=$(du -h "$dump_file" | cut -f1)
	log_ok "Dump complete: $dump_file ($size)"
}

# ── Restore to Primary ──────────────────────────────────────────────────────

restore_to_primary() {
	local dump_file="$1"
	local primary_host="${DB_HOST:-localhost}"
	local primary_port="${DB_PORT:-5434}"

	log_info "Restoring to primary database..."
	log_info "  Host: $primary_host:$primary_port"
	log_info "  DB:   $TARGET_DATABASE"

	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN: Would restore $dump_file to $primary_host:$primary_port/$TARGET_DATABASE"
		return
	fi

	# Drain connections on primary
	log_info "Draining existing connections on primary..."
	psql -h "$primary_host" -p "$primary_port" -U "$DB_USER" -d postgres <<-SQL 2>/dev/null || true
		SELECT pg_terminate_backend(pg_stat_activity.pid)
		FROM pg_stat_activity
		WHERE pg_stat_activity.datname = '$TARGET_DATABASE'
		  AND pid <> pg_backend_pid();
	SQL

	# Drop and recreate target database
	log_info "Dropping and recreating '$TARGET_DATABASE'..."
	dropdb --if-exists \
		-h "$primary_host" -p "$primary_port" -U "$DB_USER" \
		"$TARGET_DATABASE" 2>/dev/null || true

	createdb \
		-h "$primary_host" -p "$primary_port" -U "$DB_USER" \
		"$TARGET_DATABASE" -O "$DB_USER"

	# Restore
	log_info "Restoring data..."
	pg_restore \
		-h "$primary_host" \
		-p "$primary_port" \
		-U "$DB_USER" \
		-d "$TARGET_DATABASE" \
		--no-owner \
		--no-acl \
		--verbose \
		--exit-on-error \
		"$dump_file" 2>&1 | while IFS= read -r line; do
			log_info "  pg_restore: $line"
		done

	local restore_status=$?
	if [ $restore_status -ne 0 ]; then
		log_error "Restore to primary failed"
		return 1
	fi

	log_ok "Restore to primary completed"
}

# ── Verify Restore ──────────────────────────────────────────────────────────

verify_restore() {
	log_info "Verifying restored data on primary..."

	# Row count check
	local row_count
	row_count=$(psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5434}" \
		-U "$DB_USER" -d "$TARGET_DATABASE" -t -A -c \
		"SELECT COUNT(*) FROM \"user\";" 2>/dev/null || echo "0")

	log_info "User table row count: ${row_count}"

	# Quick query test
	if psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5434}" \
		-U "$DB_USER" -d "$TARGET_DATABASE" -c \
		"SELECT 'Database restore verified at ' || NOW();" &>/dev/null; then
		log_ok "Database is queryable"
	else
		log_error "Database is not responding to queries"
		return 1
	fi
}

# ── Cleanup ─────────────────────────────────────────────────────────────────

cleanup_temp_server() {
	local server_name="$1"

	if [ "$NO_CLEANUP" = true ]; then
		log_warn "Skipping cleanup of temp server '$server_name' (--no-cleanup)"
		log_info "Remember to delete it manually to avoid ongoing costs:"
		log_info "  az postgres flexible-server delete --name '$server_name' --resource-group '$SOURCE_RESOURCE_GROUP' --yes"
		return
	fi

	log_info "Deleting temporary PITR server: $server_name"

	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN: Would delete server '$server_name'"
		return
	fi

	az postgres flexible-server delete \
		--resource-group "$SOURCE_RESOURCE_GROUP" \
		--name "$server_name" \
		--yes \
		--only-show-errors 2>&1 | while IFS= read -r line; do
			log_info "  Azure: $line"
		done

	log_ok "Temporary server deleted"
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
	if [ -z "$RESTORE_TIME" ]; then
		log_error "No restore timestamp provided."
		log_info "Usage: $0 [OPTIONS] TIMESTAMP"
		log_info "  Use --help for more information."
		exit 1
	fi

	check_dependencies
	verify_azure_login

	echo ""
	echo "╔══════════════════════════════════════════════════════════════════╗"
	echo "║  ⚠️   POINT-IN-TIME RESTORE                                    ║"
	echo "║                                                                  ║"
	echo "║  Source Server:  $SOURCE_SERVER"
	echo "║  Resource Group: $SOURCE_RESOURCE_GROUP"
	echo "║  Restore Time:   $RESTORE_TIME"
	echo "║  Target DB:      $TARGET_DATABASE"
	echo "║                                                                  ║"
	echo "║  This will:                                                      ║"
	echo "║  1. Create a temp server from the PITR backup                    ║"
	echo "║  2. Dump data from the temp server                               ║"
	echo "║  3. Restore to the primary database                              ║"
	echo "║  4. Delete the temp server (unless --no-cleanup)                 ║"
	echo "╚══════════════════════════════════════════════════════════════════╝"
	echo ""

	if [ "$DRY_RUN" = false ]; then
		read -rp "  Type 'PITR-$SOURCE_SERVER' to confirm: " confirm
		if [ "$confirm" != "PITR-$SOURCE_SERVER" ]; then
			log_error "Aborted by user."
			exit 1
		fi
	fi

	# Parse and validate timestamp
	local parsed_time
	parsed_time=$(validate_timestamp "$RESTORE_TIME")

	# Verify source server + get region
	local source_region
	source_region=$(verify_source_server)

	# Create PITR server
	local temp_server
	temp_server=$(create_pitr_server "$parsed_time" "$source_region")

	# Wait for server to be ready
	wait_for_server "$temp_server"

	# Allow access
	allow_temp_firewall "$temp_server" || true

	# Get hostname after it's ready
	local temp_dir
	temp_dir=$(mktemp -d)
	local dump_file="$temp_dir/pitr_dump_$(date +%Y%m%d_%H%M%S).dump"

	# Dump
	dump_from_temp "$temp_server" "$dump_file" || {
		log_error "Dump failed"
		cleanup_temp_server "$temp_server"
		rm -rf "$temp_dir"
		exit 1
	}

	# Restore to primary
	restore_to_primary "$dump_file" || {
		log_error "Restore to primary failed"
		cleanup_temp_server "$temp_server"
		rm -rf "$temp_dir"
		exit 1
	}

	# Verify
	verify_restore || log_warn "Verification found issues"

	# Cleanup
	cleanup_temp_server "$temp_server"
	rm -rf "$temp_dir"

	echo ""
	log_ok "Point-in-time restore completed!"
	log_info "Restore time: $parsed_time"
	log_info "Primary DB:   ${DB_HOST:-localhost}:${DB_PORT:-5434}/$TARGET_DATABASE"
	log_info "Run migrations: cd apps/web && bun run db:migrate"
	echo ""
}

main "$@"
