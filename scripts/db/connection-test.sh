#!/usr/bin/env bash
# connection-test.sh — Comprehensive PostgreSQL connection diagnostics
#
# Usage:
#   ./scripts/db/connection-test.sh                     # Full diagnostics
#   ./scripts/db/connection-test.sh --quick              # Quick connectivity only
#   ./scripts/db/connection-test.sh --json               # JSON output for monitoring
#   ./scripts/db/connection-test.sh --continuous 30      # Continuous monitoring every 30s
#
# Tests:
#   1. Direct PostgreSQL connection
#   2. PgBouncer connection (if configured)
#   3. Connection pool (via application)
#   4. Latency measurements
#   5. SSL/TLS verification
#   6. Active connection count
#   7. Replication lag
#   8. Connection limits
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Config ──────────────────────────────────────────────────────────────────

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-lazynext}"
DB_NAME="${DB_NAME:-lazynext}"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var}"
DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"

# PgBouncer
PGBOUNCER_HOST="${PGBOUNCER_HOST:-localhost}"
PGBOUNCER_PORT="${PGBOUNCER_PORT:-6432}"

# Application pool health endpoint
APP_HEALTH_URL="${APP_HEALTH_URL:-http://localhost:3000/api/db-health}"

# Timeouts
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-5}"
QUERY_TIMEOUT="${QUERY_TIMEOUT:-10}"

export PGPASSWORD="$DB_PASSWORD"
PGPASSWORD="$DB_PASSWORD"

# ── Color Helpers ────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

pass_fail() {
	if [ "$1" = "pass" ]; then
		echo -e "${GREEN}PASS${NC}"
	else
		echo -e "${RED}FAIL${NC}"
	fi
}

# ── Parse Args ──────────────────────────────────────────────────────────────

QUICK_MODE=false
JSON_OUTPUT=false
CONTINUOUS=false
CONTINUOUS_INTERVAL=30

while [[ $# -gt 0 ]]; do
	case "$1" in
		--quick|-q)
			QUICK_MODE=true
			;;
		--json|-j)
			JSON_OUTPUT=true
			;;
		--continuous|-c)
			CONTINUOUS=true
			CONTINUOUS_INTERVAL="${2:-30}"
			shift 2>/dev/null || true
			;;
		--help|-h)
			cat <<'EOF'
connection-test.sh — PostgreSQL Connection Diagnostics

Usage:
  connection-test.sh [OPTIONS]

Options:
  --quick, -q        Quick check — only direct connection test
  --json, -j         Output results as JSON (for monitoring integration)
  --continuous N, -c N  Run continuously every N seconds (default: 30)
  --help, -h         This help message

Environment:
  DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASSWORD
  PGBOUNCER_HOST, PGBOUNCER_PORT
  APP_HEALTH_URL
EOF
			exit 0
			;;
		*)
			echo "Unknown option: $1"; exit 1
			;;
	esac
	shift
done

# ── Utility ─────────────────────────────────────────────────────────────────

run_psql() {
	local host="${1:-$DB_HOST}"
	local port="${2:-$DB_PORT}"
	local query="$3"
	local db="${4:-$DB_NAME}"

	psql \
		-h "$host" \
		-p "$port" \
		-U "$DB_USER" \
		-d "$db" \
		-t -A \
		-c "$query" \
		2>/dev/null
}

measure_latency() {
	local host="$1"
	local port="$2"
	local label="$3"

	local start
	start=$(python3 -c "import time; print(time.time())" 2>/dev/null || \
				 perl -MTime::HiRes=time -e "print time()" 2>/dev/null || \
				 date +%s)

	local result
	result=$(psql \
		-h "$host" \
		-p "$port" \
		-U "$DB_USER" \
		-d "$DB_NAME" \
		-t -A \
		-c "SELECT 1 AS latency_test" \
		2>/dev/null)

	local end
	end=$(python3 -c "import time; print(time.time())" 2>/dev/null || \
				perl -MTime::HiRes=time -e "print time()" 2>/dev/null || \
				date +%s)

	if [ "$result" = "1" ]; then
		local latency_ms
		# Calculate latency (python does real sub-second; date only seconds)
		latency_ms=$(python3 -c "print(round(($end - $start) * 1000))" 2>/dev/null || \
								 echo "$(( (end - start) * 1000 ))")
		echo "$latency_ms"
	else
		echo "-1"
	fi
}

# ── Test Functions ──────────────────────────────────────────────────────────

test_direct_connection() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── Direct PostgreSQL Connection ────────────────────────────────────"
	fi

	local latency
	latency=$(measure_latency "$DB_HOST" "$DB_PORT" "direct")

	local status="fail"
	local version=""

	if [ "$latency" != "-1" ]; then
		status="pass"
		version=$(run_psql "$DB_HOST" "$DB_PORT" "SELECT version();" "$DB_NAME" | head -1)
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"directConnection": {
		"status": "$status",
		"host": "$DB_HOST",
		"port": $DB_PORT,
		"latencyMs": $latency,
		"version": "$version"
	}
JSON
	else
		printf "  %-25s %-15s " "Direct Connection" "$DB_HOST:$DB_PORT"
		pass_fail "$status"
		if [ "$status" = "pass" ]; then
			echo "    Latency:   ${latency}ms"
			echo "    Version:   $version"
		fi
	fi
}

test_pgbouncer() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── PgBouncer Connection ────────────────────────────────────────────"
	fi

	local status="skip"
	local latency="-1"
	local pgbouncer_version=""
	local pool_mode=""

	# Check if PgBouncer is reachable
	if timeout "$CONNECT_TIMEOUT" bash -c "echo >/dev/tcp/$PGBOUNCER_HOST/$PGBOUNCER_PORT" 2>/dev/null; then
		latency=$(measure_latency "$PGBOUNCER_HOST" "$PGBOUNCER_PORT" "pgbouncer")
		if [ "$latency" != "-1" ]; then
			status="pass"
			# Get PgBouncer stats
			pgbouncer_version=$(run_psql "$PGBOUNCER_HOST" "$PGBOUNCER_PORT" "SHOW VERSION;" "pgbouncer" 2>/dev/null || echo "unknown")
			pool_mode=$(run_psql "$PGBOUNCER_HOST" "$PGBOUNCER_PORT" "SHOW POOL_MODE;" "pgbouncer" 2>/dev/null || echo "unknown")
		else
			status="fail"
		fi
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"pgbouncer": {
		"status": "$status",
		"host": "$PGBOUNCER_HOST",
		"port": $PGBOUNCER_PORT,
		"latencyMs": $latency,
		"version": "$pgbouncer_version",
		"poolMode": "$pool_mode"
	}
JSON
	else
		printf "  %-25s %-15s " "PgBouncer" "$PGBOUNCER_HOST:$PGBOUNCER_PORT"
		if [ "$status" = "skip" ]; then
			echo -e "${YELLOW}SKIP${NC} (not reachable)"
		else
			pass_fail "$status"
			if [ "$status" = "pass" ]; then
				echo "    Latency:   ${latency}ms"
				echo "    Version:   $pgbouncer_version"
				echo "    Pool Mode: $pool_mode"
			fi
		fi
	fi
}

test_ssl() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── SSL/TLS Connectivity ────────────────────────────────────────────"
	fi

	local ssl_enabled="unknown"
	local ssl_cipher="unknown"
	local ssl_status="skip"

	# Query SSL status
	local ssl_info
	ssl_info=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();" \
		"$DB_NAME" 2>/dev/null)

	if [ -n "$ssl_info" ]; then
		ssl_status="pass"
		ssl_enabled=$(echo "$ssl_info" | cut -d'|' -f1)
		ssl_cipher=$(echo "$ssl_info" | cut -d'|' -f3)
	fi

	# Test SSL-required connection
	local ssl_required_test
	ssl_required_test=$(PGSSLMODE="require" psql \
		-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
		-t -A -c "SELECT 'ssl-ok'" 2>/dev/null || echo "")

	if [ -n "$ssl_required_test" ]; then
		ssl_status="pass"
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"ssl": {
		"status": "$ssl_status",
		"enabled": "$ssl_enabled",
		"cipher": "$ssl_cipher",
		"requiredSupported": $( [ -n "$ssl_required_test" ] && echo true || echo false )
	}
JSON
	else
		printf "  %-25s %-15s " "SSL Enabled" "$ssl_enabled"
		if [ "$ssl_enabled" = "t" ] || [ "$ssl_enabled" = "true" ]; then
			pass_fail "pass"
		else
			pass_fail "fail"
		fi
		if [ -n "$ssl_cipher" ] && [ "$ssl_cipher" != "unknown" ]; then
			echo "    Cipher:    $ssl_cipher"
		fi
		printf "  %-25s %-15s " "SSL Required Mode"
		if [ -n "$ssl_required_test" ]; then
			pass_fail "pass"
		else
			pass_fail "fail"
		fi
	fi
}

test_active_connections() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── Active Connections ──────────────────────────────────────────────"
	fi

	local total active idle idle_in_transaction waiting max_conn state_summary

	total=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity;" "postgres" 2>/dev/null || echo "0")

	active=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" "postgres" 2>/dev/null || echo "0")

	idle=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';" "postgres" 2>/dev/null || echo "0")

	idle_in_transaction=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';" "postgres" 2>/dev/null || echo "0")

	waiting=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL AND state = 'active';" "postgres" 2>/dev/null || echo "0")

	max_conn=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SHOW max_connections;" "postgres" 2>/dev/null || echo "100")

	# Percentage used
	local pct
	pct=$(awk "BEGIN {printf \"%.1f\", ($total/$max_conn)*100}" 2>/dev/null || echo "0")

	local pct_status="pass"
	if [ "$(echo "$pct > 80" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
		pct_status="warn"
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"connections": {
		"total": $total,
		"active": $active,
		"idle": $idle,
		"idleInTransaction": $idle_in_transaction,
		"waiting": $waiting,
		"maxConnections": $max_conn,
		"utilizationPercent": $pct
	}
JSON
	else
		printf "  %-25s " "Total Connections"
		echo "$total / $max_conn ($pct%)"

		printf "  %-25s " "  Active"
		echo "$active"

		printf "  %-25s " "  Idle"
		echo "$idle"

		printf "  %-25s " "  Idle in Transaction"
		echo "$idle_in_transaction"

		printf "  %-25s " "  Waiting"
		echo "$waiting"

		if [ "$pct_status" = "warn" ]; then
			echo -e "  ${YELLOW}WARNING: Connection utilization is high ($pct%)${NC}"
		fi

		# Show per-database breakdown
		echo ""
		echo "  Per-Database Breakdown:"
		run_psql "$DB_HOST" "$DB_PORT" \
			"SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname ORDER BY count(*) DESC;" \
			"postgres" 2>/dev/null | while IFS='|' read -r db count; do
			printf "    %-20s %s\n" "$db" "$count"
		done
	fi
}

test_replication_lag() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── Replication Status ──────────────────────────────────────────────"
	fi

	local lag_bytes="0"
	local lag_seconds="0"
	local in_recovery="false"
	local replicas_count="0"

	# Check if this is a primary (has replicas) or replica (in recovery)
	in_recovery=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT pg_is_in_recovery();" "$DB_NAME" 2>/dev/null || echo "false")

	# Replication lag (as seen from primary, for each replica)
	local lag_info=""
	if [ "$in_recovery" = "false" ] || [ "$in_recovery" = "f" ]; then
		# We are on the primary — check replica lag
		lag_info=$(run_psql "$DB_HOST" "$DB_PORT" \
			"SELECT application_name,
			        pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
							EXTRACT(EPOCH FROM (NOW() - replay_time))::int AS lag_seconds
			 FROM pg_stat_replication;" \
			"$DB_NAME" 2>/dev/null || echo "")

		replicas_count=$(echo "$lag_info" | grep -c . 2>/dev/null || echo "0")

		if [ -n "$lag_info" ]; then
			lag_bytes=$(echo "$lag_info" | head -1 | cut -d'|' -f2)
			lag_seconds=$(echo "$lag_info" | head -1 | cut -d'|' -f3)
		fi
	else
		# We are on a replica — check our own lag
		lag_bytes=$(run_psql "$DB_HOST" "$DB_PORT" \
			"SELECT pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn());" \
			"$DB_NAME" 2>/dev/null || echo "0")

		lag_seconds=$(run_psql "$DB_HOST" "$DB_PORT" \
			"SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::int;" \
			"$DB_NAME" 2>/dev/null || echo "0")
	fi

	local lag_status="pass"
	if [ "${lag_seconds:-0}" -gt 10 ]; then
		lag_status="warn"
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"replication": {
		"inRecovery": $( [ "$in_recovery" = "t" ] || [ "$in_recovery" = "true" ] && echo true || echo false ),
		"lagBytes": ${lag_bytes:-0},
		"lagSeconds": ${lag_seconds:-0},
		"replicaCount": ${replicas_count:-0}
	}
JSON
	else
		if [ "$in_recovery" = "t" ] || [ "$in_recovery" = "true" ]; then
			echo "  Server Mode: REPLICA (read-only)"
		else
			echo "  Server Mode: PRIMARY"
			echo "  Replicas:    $replicas_count"
		fi

		printf "  %-25s " "Replication Lag"
		if [ "${lag_seconds:-0}" = "0" ] || [ -z "$lag_seconds" ]; then
			echo "No lag detected"
		elif [ "$lag_status" = "pass" ]; then
			echo -e "${GREEN}${lag_seconds}s${NC} (${lag_bytes} bytes)"
		else
			echo -e "${RED}${lag_seconds}s${NC} (${lag_bytes} bytes) — HIGH LAG"
		fi
	fi
}

test_long_running_queries() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── Long-Running Queries (>30s) ────────────────────────────────────"
	fi

	local long_queries
	long_queries=$(run_psql "$DB_HOST" "$DB_PORT" \
		"SELECT count(*) FROM pg_stat_activity
		 WHERE state = 'active'
		   AND query_start < NOW() - INTERVAL '30 seconds'
		   AND query NOT LIKE '%pg_stat_activity%';" \
		"$DB_NAME" 2>/dev/null || echo "0")

	local long_count="${long_queries:-0}"

	if [ "$JSON_OUTPUT" = true ]; then
		cat <<JSON
	"longRunningQueries": {
		"count": $long_count,
		"thresholdSeconds": 30
	}
JSON
	else
		printf "  %-25s " "Queries >30s"
		if [ "$long_count" -gt 0 ]; then
			echo -e "${RED}$long_count${NC}"
			# Show the top 5 longest queries
			echo ""
			echo "  Top queries by duration:"
			run_psql "$DB_HOST" "$DB_PORT" \
				"SELECT pid,
				        EXTRACT(EPOCH FROM (NOW() - query_start))::int AS duration_s,
								LEFT(query, 80) AS query_preview
				 FROM pg_stat_activity
				 WHERE state = 'active'
				   AND query NOT LIKE '%pg_stat_activity%'
				 ORDER BY query_start ASC
				 LIMIT 5;" "$DB_NAME" 2>/dev/null | while IFS='|' read -r pid dur q; do
				printf "    PID %-8s %5ss  %s\n" "$pid" "$dur" "$q"
			done
		else
			echo -e "${GREEN}0${NC}"
		fi
	fi
}

test_app_pool_health() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "── Application Pool Health Endpoint ───────────────────────────────"
	fi

	local app_status="skip"
	local app_details=""

	if curl -s --max-time 5 "$APP_HEALTH_URL" &>/dev/null; then
		app_details=$(curl -s --max-time 5 "$APP_HEALTH_URL" 2>/dev/null || echo "")
		if echo "$app_details" | jq -e '.healthy' &>/dev/null 2>&1; then
			app_status="pass"
		else
			app_status="fail"
		fi
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		if [ "$app_status" = "pass" ]; then
			echo "\"appPoolHealth\": $app_details,"
		else
			cat <<JSON
	"appPoolHealth": {
		"status": "$app_status",
		"url": "$APP_HEALTH_URL"
	}
JSON
		fi
	else
		printf "  %-25s %-15s " "Health Endpoint" "$APP_HEALTH_URL"
		if [ "$app_status" = "skip" ]; then
			echo -e "${YELLOW}SKIP${NC} (not reachable)"
		elif [ "$app_status" = "pass" ]; then
			pass_fail "pass"
		else
			pass_fail "fail"
		fi
	fi
}

# ── Quick Test ──────────────────────────────────────────────────────────────

run_quick_test() {
	echo "🔍 Quick PostgreSQL Connection Test"
	echo "  Host: $DB_HOST:$DB_PORT  DB: $DB_NAME  User: $DB_USER"
	echo ""

	local result
	result=$(psql \
		-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
		-t -A -c "SELECT 'CONNECTED — ' || NOW();" 2>&1)

	if [ $? -eq 0 ]; then
		echo -e "  ${GREEN}✓ Connected successfully${NC}"
		echo "  $result"
		echo ""
		echo "  Database: $(run_psql "$DB_HOST" "$DB_PORT" 'SELECT current_database();' "$DB_NAME")"
		echo "  Version:  $(run_psql "$DB_HOST" "$DB_PORT" 'SELECT version();' "$DB_NAME" | head -c 80)"
		exit 0
	else
		echo -e "  ${RED}✗ Connection FAILED${NC}"
		echo "  Error: $result"
		exit 1
	fi
}

# ── Full Diagnostics ────────────────────────────────────────────────────────

run_full_diagnostics() {
	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "╔══════════════════════════════════════════════════════════════════════╗"
		echo "║       Lazynext PostgreSQL Connection Diagnostics                     ║"
		echo "║       $(date '+%Y-%m-%d %H:%M:%S')                                         ║"
		echo "╚══════════════════════════════════════════════════════════════════════╝"
		echo "  Target: $DB_HOST:$DB_PORT/$DB_NAME"
		echo "  User:   $DB_USER"
	fi

	if [ "$JSON_OUTPUT" = true ]; then
		echo "{"
		echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
		echo "  \"target\": {"
		echo "    \"host\": \"$DB_HOST\","
		echo "    \"port\": $DB_PORT,"
		echo "    \"database\": \"$DB_NAME\","
		echo "    \"user\": \"$DB_USER\""
		echo "  },"
	fi

	test_direct_connection
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_pgbouncer
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_ssl
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_active_connections
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_replication_lag
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_long_running_queries
	[ "$JSON_OUTPUT" = true ] && echo ","
	test_app_pool_health

	if [ "$JSON_OUTPUT" = true ]; then
		echo "}"
	fi

	if [ "$JSON_OUTPUT" = false ]; then
		echo ""
		echo "──────────────────────────────────────────────────────────────────────"
		echo -e "  Diagnostics complete — $(date '+%H:%M:%S')"
		echo ""
	fi
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
	if [ "$QUICK_MODE" = true ]; then
		run_quick_test
		exit 0
	fi

	if [ "$CONTINUOUS" = true ]; then
		echo "🔄 Continuous monitoring every ${CONTINUOUS_INTERVAL}s — Ctrl+C to stop"
		while true; do
			clear 2>/dev/null || true
			run_full_diagnostics
			sleep "$CONTINUOUS_INTERVAL"
		done
	fi

	run_full_diagnostics
}

main "$@"
