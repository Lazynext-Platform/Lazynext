#!/usr/bin/env bash
# seed-analytics.sh — Generate test data for analytics tables
#
# Usage:
#   ./scripts/db/seed-analytics.sh                        # 30 days of data, 100 users
#   ./scripts/db/seed-analytics.sh --users 1000           # 1000 simulated users
#   ./scripts/db/seed-analytics.sh --days 90              # 90 days of history
#   ./scripts/db/seed-analytics.sh --clean                # Remove seed data only
#   ./scripts/db/seed-analytics.sh --events 500000        # Target event count
#
# Generates:
#   - Analytics events (page views, clicks, exports, AI usage, etc.)
#   - User sessions with realistic geography & device data
#   - Feature flag evaluations
#   - A/B experiment assignments
#   - Audit log entries
#
# Prerequisites:
#   - PostgreSQL running with analytics tables created (migration 0002)
#   - psql available
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
export PGPASSWORD

# ── Color Helpers ────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

# ── Parse Args ──────────────────────────────────────────────────────────────

NUM_USERS=100
NUM_DAYS=30
NUM_EVENTS=0  # 0 = proportional to users * days
CLEAN_MODE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--users)
			NUM_USERS="$2"
			shift
			;;
		--days)
			NUM_DAYS="$2"
			shift
			;;
		--events)
			NUM_EVENTS="$2"
			shift
			;;
		--clean)
			CLEAN_MODE=true
			;;
		--dry-run)
			DRY_RUN=true
			;;
		--help|-h)
			cat <<'EOF'
seed-analytics.sh — Seed analytics test data

Usage:
  seed-analytics.sh [OPTIONS]

Options:
  --users N       Number of simulated users (default: 100)
  --days N        Days of history to generate (default: 30)
  --events N      Target number of analytics events (default: proportional)
  --clean         Remove all seed data (users with 'seed_' prefix)
  --dry-run       Preview what would be inserted without executing
  --help, -h      This help message
EOF
			exit 0
			;;
		*)
			echo "Unknown option: $1"; exit 1
			;;
	esac
	shift
done

# ── SQL Helper ──────────────────────────────────────────────────────────────

run_sql() {
	if [ "$DRY_RUN" = true ]; then
		log_info "DRY RUN: $1"
		return
	fi
	psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

# ── Cleanup ─────────────────────────────────────────────────────────────────

do_clean() {
	log_info "Cleaning seed analytics data..."

	run_sql "DELETE FROM ab_assignments WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');"
	run_sql "DELETE FROM audit_log_v2 WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');"
	run_sql "DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');"
	run_sql "DELETE FROM analytics_events WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');"
	run_sql "DELETE FROM \"user\" WHERE email LIKE 'seed_%';"

	log_ok "Seed data cleaned up."
}

if [ "$CLEAN_MODE" = true ]; then
	do_clean
	exit 0
fi

# ── Seed Users ──────────────────────────────────────────────────────────────

log_info "Seeding analytics test data..."
log_info "  Users: $NUM_USERS"
log_info "  Days:  $NUM_DAYS"

if [ "$NUM_EVENTS" -eq 0 ]; then
	NUM_EVENTS=$((NUM_USERS * NUM_DAYS * 5))
fi
log_info "  Target events: ~$NUM_EVENTS"

# ── Create Seed Users ───────────────────────────────────────────────────────

log_info "Creating $NUM_USERS seed users..."

if [ "$DRY_RUN" = false ]; then
	# Generate seed user IDs
	local seed_user_ids
	seed_user_ids=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A <<-SQL
		INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
		SELECT
			md5('seed_user_' || s.i)::uuid,
			'Seed User ' || s.i,
			'seed_user_' || s.i || '@test.lazynext.dev',
			TRUE,
			CASE WHEN s.i % 10 = 0 THEN 'admin' ELSE 'user' END,
			NOW() - (random() * INTERVAL '$NUM_DAYS days'),
			NOW() - (random() * INTERVAL '$NUM_DAYS days')
		FROM generate_series(1, $NUM_USERS) AS s(i)
		ON CONFLICT (email) DO NOTHING
		RETURNING id;
	SQL
	)
	local user_count
	user_count=$(echo "$seed_user_ids" | grep -c . 2>/dev/null || echo "0")
	log_ok "Created $user_count seed users"
else
	log_info "DRY RUN: Would create $NUM_USERS seed users"
fi

# ── Seed User Sessions ──────────────────────────────────────────────────────

log_info "Creating user sessions..."

local countries=("US" "US" "US" "GB" "DE" "FR" "JP" "AU" "CA" "BR" "IN" "NL")
local devices=("desktop" "desktop" "desktop" "mobile" "mobile" "tablet")
local browsers=("Chrome" "Chrome" "Firefox" "Safari" "Safari" "Edge" "Brave")
local os_list=("macOS" "macOS" "Windows" "Windows" "Linux" "iOS" "Android")
local referrers=("" "https://google.com" "https://twitter.com" "https://youtube.com" "https://reddit.com" "direct")

if [ "$DRY_RUN" = false ]; then
	run_sql "
		INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent,
			country, region, city, timezone, device_type, browser, browser_version,
			os, os_version, screen_width, screen_height, is_active, started_at,
			last_active_at, duration_seconds, page_views, events_count,
			utm_source, utm_medium, utm_campaign, referrer)
		SELECT
			u.id AS user_id,
			md5(u.id::text || s.i::text) AS session_token,
			('192.168.' || (random() * 255)::int || '.' || (random() * 255)::int)::inet AS ip_address,
			'Mozilla/5.0 Seed Test' AS user_agent,
			(ARRAY['${countries[*]}'])[1 + (random() * ${#countries[@]})::int % ${#countries[@]}] AS country,
			CASE
				WHEN (ARRAY['${countries[*]}'])[1 + (random() * ${#countries[@]})::int % ${#countries[@]}] = 'US'
					THEN (ARRAY['California', 'New York', 'Texas', 'Florida', 'Illinois'])[1 + (random() * 5)::int]
				ELSE 'Unknown'
			END AS region,
			(ARRAY['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo'])[1 + (random() * 5)::int] AS city,
			(ARRAY['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo'])[1 + (random() * 5)::int] AS timezone,
			(ARRAY['${devices[*]}'])[1 + (random() * ${#devices[@]})::int % ${#devices[@]}] AS device_type,
			(ARRAY['${browsers[*]}'])[1 + (random() * ${#browsers[@]})::int % ${#browsers[@]}] AS browser,
			(80 + (random() * 40)::int)::text AS browser_version,
			(ARRAY['${os_list[*]}'])[1 + (random() * ${#os_list[@]})::int % ${#os_list[@]}] AS os,
			(10 + (random() * 18)::int)::text AS os_version,
			(ARRAY[1920, 2560, 1440, 375, 414, 768])[1 + (random() * 6)::int] AS screen_width,
			(ARRAY[1080, 1440, 900, 812, 896, 1024])[1 + (random() * 6)::int] AS screen_height,
			random() < 0.7 AS is_active,
			NOW() - (random() * INTERVAL '$NUM_DAYS days') AS started_at,
			NOW() - (random() * INTERVAL '6 hours') AS last_active_at,
			(60 + (random() * 3600)::int) AS duration_seconds,
			(1 + (random() * 50)::int) AS page_views,
			(1 + (random() * 100)::int) AS events_count,
			CASE WHEN random() < 0.3 THEN (ARRAY['google', 'twitter', 'newsletter', 'youtube'])[1 + (random() * 4)::int] END AS utm_source,
			CASE WHEN random() < 0.3 THEN (ARRAY['cpc', 'social', 'email', 'organic'])[1 + (random() * 4)::int] END AS utm_medium,
			CASE WHEN random() < 0.3 THEN (ARRAY['launch_2026', 'ai_features', 'pro_plan'])[1 + (random() * 3)::int] END AS utm_campaign,
			(ARRAY['${referrers[*]}'])[1 + (random() * ${#referrers[@]})::int % ${#referrers[@]}] AS referrer
		FROM "user" u
		CROSS JOIN generate_series(1, GREATEST(1, (SELECT CASE WHEN COUNT(*) > 0 THEN COUNT(*) ELSE 1 END FROM "user" WHERE email LIKE 'seed_%') / 10)) AS s(i)
		WHERE u.email LIKE 'seed_%'
		ON CONFLICT (session_token) DO NOTHING;
	"

	local session_count
	session_count=$(run_sql "SELECT COUNT(*) FROM user_sessions WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")
	log_ok "Created $session_count sessions"
fi

# ── Seed Analytics Events ───────────────────────────────────────────────────

log_info "Generating analytics events..."

local event_names=(
	"page_view" "project_created" "clip_added" "timeline_edit"
	"preview_rendered" "export_started" "export_completed" "export_failed"
	"ai_copilot_query" "ai_copilot_response" "ai_credit_consumed"
	"collaboration_invite" "collaboration_joined" "feedback_submitted"
	"subscription_upgraded" "subscription_downgraded"
	"plugin_installed" "plugin_used" "search_performed"
	"template_applied" "effect_applied" "transition_added"
	"audio_imported" "transcription_requested" "rotoscoping_requested"
	"keyboard_shortcut_used" "settings_changed" "profile_updated"
)

local event_categories=(
	"navigation" "project" "editing" "editing"
	"rendering" "export" "export" "export"
	"ai" "ai" "ai"
	"collaboration" "collaboration" "feedback"
	"billing" "billing"
	"plugins" "plugins" "search"
	"templates" "effects" "transitions"
	"import" "ai" "ai"
	"ux" "settings" "account"
)

if [ "$DRY_RUN" = false ]; then
	# Generate events in batches to avoid massive single transactions
	local BATCH_SIZE=1000
	local total_inserted=0

	for ((batch=0; batch < NUM_EVENTS; batch+=BATCH_SIZE)); do
		local batch_end=$((batch + BATCH_SIZE))
		if [ $batch_end -gt $NUM_EVENTS ]; then
			batch_end=$NUM_EVENTS
		fi
		local batch_count=$((batch_end - batch))

		run_sql "
			INSERT INTO analytics_events (event_name, event_category, user_id,
				anonymous_id, session_id, project_id, properties, page_url, referrer, ip_address)
			SELECT
				(ARRAY['${event_names[*]}'])[1 + (random() * ${#event_names[@]})::int % ${#event_names[@]}] AS event_name,
				(ARRAY['${event_categories[*]}'])[1 + (random() * ${#event_categories[@]})::int % ${#event_categories[@]}] AS event_category,
				(SELECT id FROM \"user\" WHERE email LIKE 'seed_%' ORDER BY random() LIMIT 1) AS user_id,
				md5(random()::text) AS anonymous_id,
				(SELECT session_token FROM user_sessions WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%') ORDER BY random() LIMIT 1) AS session_id,
				CASE WHEN random() < 0.3 THEN (SELECT id FROM \"project\" ORDER BY random() LIMIT 1) END AS project_id,
				jsonb_build_object(
					'value', (random() * 100)::int,
					'duration_ms', (random() * 5000)::int,
					'success', random() < 0.9,
					'platform', 'web',
					'version', '0.1.0'
				) AS properties,
				(ARRAY['/editor', '/dashboard', '/projects', '/settings', '/billing', '/templates'])[1 + (random() * 6)::int] AS page_url,
				CASE WHEN random() < 0.2 THEN (ARRAY['https://google.com', 'https://twitter.com', ''])[1 + (random() * 3)::int] END AS referrer,
				('10.0.' || (random() * 255)::int || '.' || (random() * 255)::int)::inet AS ip_address
			FROM generate_series(1, $batch_count) AS s(i);
		"

		total_inserted=$((total_inserted + batch_count))

		# Progress indicator
		local pct=$((total_inserted * 100 / NUM_EVENTS))
		if [ $((total_inserted % 10000)) -lt $BATCH_SIZE ] || [ $total_inserted -ge $NUM_EVENTS ]; then
			log_info "  Events: $total_inserted / $NUM_EVENTS (${pct}%)"
		fi
	done

	local event_count
	event_count=$(run_sql "SELECT COUNT(*) FROM analytics_events WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")
	log_ok "Created $event_count analytics events"
fi

# ── Seed Audit Log v2 ───────────────────────────────────────────────────────

log_info "Generating audit log entries..."

audit_actions=(
	"project.create" "project.update" "project.delete" "project.archive"
	"clip.create" "clip.update" "clip.delete" "clip.trim"
	"timeline.export" "timeline.duplicate"
	"user.signup" "user.login" "user.logout" "user.update_profile"
	"subscription.create" "subscription.update" "subscription.cancel"
	"api_key.create" "api_key.revoke"
	"collaboration.invite" "collaboration.accept" "collaboration.remove"
	"plugin.install" "plugin.uninstall"
)

audit_resources=(
	"project" "project" "project" "project"
	"clip" "clip" "clip" "clip"
	"timeline" "timeline"
	"user" "user" "user" "user"
	"subscription" "subscription" "subscription"
	"api_key" "api_key"
	"collaboration" "collaboration" "collaboration"
	"plugin" "plugin"
)

if [ "$DRY_RUN" = false ]; then
	local audit_count=$((NUM_USERS * NUM_DAYS / 3))
	if [ "$audit_count" -gt 50000 ]; then
		audit_count=50000
	fi
	if [ "$audit_count" -lt 100 ]; then
		audit_count=100
	fi

	run_sql "
		INSERT INTO audit_log_v2 (user_id, action, resource_type, resource_id,
			previous_state, new_state, changed_fields, request_id,
			ip_address, user_agent, status, duration_ms)
		SELECT
			(SELECT id FROM \"user\" WHERE email LIKE 'seed_%' ORDER BY random() LIMIT 1) AS user_id,
			(ARRAY['${audit_actions[*]}'])[1 + (random() * ${#audit_actions[@]})::int % ${#audit_actions[@]}] AS action,
			(ARRAY['${audit_resources[*]}'])[1 + (random() * ${#audit_resources[@]})::int % ${#audit_resources[@]}] AS resource_type,
			md5(random()::text)::uuid AS resource_id,
			CASE WHEN random() < 0.5 THEN '{}'::jsonb END AS previous_state,
			CASE WHEN random() < 0.5 THEN '{}'::jsonb END AS new_state,
			CASE WHEN random() < 0.3 THEN ARRAY['name', 'status', 'metadata'] END AS changed_fields,
			md5(random()::text) AS request_id,
			('10.0.' || (random() * 255)::int || '.' || (random() * 255)::int)::inet AS ip_address,
			'Mozilla/5.0 Seed Audit' AS user_agent,
			CASE WHEN random() < 0.95 THEN 'success' ELSE 'failure' END AS status,
			(random() * 500)::int AS duration_ms
		FROM generate_series(1, $audit_count) AS s(i);
	"

	local audit_inserted
	audit_inserted=$(run_sql "SELECT COUNT(*) FROM audit_log_v2 WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")
	log_ok "Created $audit_inserted audit log entries"
fi

# ── Seed A/B Experiment Assignments ─────────────────────────────────────────

log_info "Creating A/B experiment assignments..."

if [ "$DRY_RUN" = false ]; then
	# Check if experiments exist, create a default one if not
	local exp_count
	exp_count=$(run_sql "SELECT COUNT(*) FROM ab_experiments;")

	if [ "$exp_count" = "0" ]; then
		log_info "Creating default A/B experiment..."

		run_sql "
			INSERT INTO ab_experiments (experiment_key, experiment_name, description, variants,
				success_metrics, target_percentage, target_environment, status, started_at)
			VALUES (
				'new_timeline_layout_seed',
				'New Timeline Layout (Seed)',
				'Testing the redesigned timeline interface',
				'[{\"key\": \"control\", \"name\": \"Original Timeline\", \"weight\": 50},
				  {\"key\": \"variant_a\", \"name\": \"Horizontal Timeline\", \"weight\": 25},
				  {\"key\": \"variant_b\", \"name\": \"Vertical Timeline\", \"weight\": 25}]'::jsonb,
				'[{\"event_name\": \"timeline_edit\", \"aggregation\": \"count\"},
				  {\"event_name\": \"export_completed\", \"aggregation\": \"rate\"}]'::jsonb,
				100,
				ARRAY['production'],
				'running',
				NOW() - INTERVAL '14 days'
			) ON CONFLICT (experiment_key) DO NOTHING;
		"
	fi

	# Assign users to variants
	run_sql "
		INSERT INTO ab_assignments (experiment_id, user_id, variant_key, assignment_hash)
		SELECT
			(SELECT id FROM ab_experiments WHERE status = 'running' ORDER BY created_at DESC LIMIT 1) AS experiment_id,
			u.id AS user_id,
			CASE
				WHEN abs(hashtext(u.id::text)) % 100 < 50 THEN 'control'
				WHEN abs(hashtext(u.id::text)) % 100 < 75 THEN 'variant_a'
				ELSE 'variant_b'
			END AS variant_key,
			md5(u.id::text) AS assignment_hash
		FROM \"user\" u
		WHERE u.email LIKE 'seed_%'
		ON CONFLICT (experiment_id, user_id) DO NOTHING;
	"

	local assign_count
	assign_count=$(run_sql "SELECT COUNT(*) FROM ab_assignments WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")
	log_ok "Created $assign_count A/B experiment assignments"
fi

# ── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo -e "  ${GREEN}Analytics Seed Complete${NC}"
echo "=========================================="

if [ "$DRY_RUN" = false ]; then
	echo "  Users:       $(run_sql "SELECT COUNT(*) FROM \"user\" WHERE email LIKE 'seed_%';")"
	echo "  Sessions:    $(run_sql "SELECT COUNT(*) FROM user_sessions WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")"
	echo "  Events:      $(run_sql "SELECT COUNT(*) FROM analytics_events WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")"
	echo "  Audit Logs:  $(run_sql "SELECT COUNT(*) FROM audit_log_v2 WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")"
	echo "  A/B Assign:  $(run_sql "SELECT COUNT(*) FROM ab_assignments WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%');")"
	echo ""
	echo "  Experiment Variant Distribution:"
	run_sql "
		SELECT '    ' || variant_key || ': ' || COUNT(*) || ' users'
		FROM ab_assignments
		WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%')
		GROUP BY variant_key
		ORDER BY variant_key;
	" 2>/dev/null || true
	echo ""
	echo "  Events by category (top 10):"
	run_sql "
		SELECT '    ' || event_category || ': ' || COUNT(*) || ' events'
		FROM analytics_events
		WHERE user_id IN (SELECT id FROM \"user\" WHERE email LIKE 'seed_%')
		GROUP BY event_category
		ORDER BY COUNT(*) DESC
		LIMIT 10;
	" 2>/dev/null || true
fi

echo "=========================================="
echo ""

if [ "$DRY_RUN" = true ]; then
	log_info "Dry run completed — no data inserted."
else
	log_ok "Analytics seed data ready for testing!"
fi

log_info "To clean up: $0 --clean"
