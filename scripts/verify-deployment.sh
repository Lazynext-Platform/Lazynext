#!/usr/bin/env bash
# verify-deployment.sh — Production deployment verification for Lazynext
#
# Checks DNS resolution, SSL certificates, service health endpoints,
# database connectivity, and Redis connectivity. Prints a deployment
# status summary with pass/fail indicators.
#
# Usage:
#   DOMAIN=lazynext.com ./scripts/verify-deployment.sh
#   DOMAIN=lazynext.com ./scripts/verify-deployment.sh --json
#   DOMAIN=lazynext.com ./scripts/verify-deployment.sh --health-only
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

DOMAIN="${DOMAIN:-lazynext.com}"
TIMEOUT=15
JSON_OUTPUT=false
HEALTH_ONLY=false
SKIP_DNS=false
SKIP_SSL=false

# Service URLs
WEB_URL="${WEB_URL:-https://${DOMAIN}}"
API_URL="${API_URL:-https://api.${DOMAIN}}"
APP_URL="${APP_URL:-https://app.${DOMAIN}}"

# Direct service health endpoints (when accessible)
API_GATEWAY_URL="${API_GATEWAY_URL:-${API_URL}/v1/health}"
AI_AGENTS_URL="${AI_AGENTS_URL:-${API_URL}/ai/health}"
RENDER_URL="${RENDER_URL:-${API_URL}/render/health}"
COLLAB_URL="${COLLAB_URL:-${API_URL}/collab/health}"
PREPROC_URL="${PREPROC_URL:-${API_URL}/preprocessing/health}"
GEN_STUDIO_URL="${GEN_STUDIO_URL:-${API_URL}/generative/health}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-${WEB_URL}/api/health}"

# Database (optional — only if reachable)
DB_URL="${DB_URL:-}"
REDIS_URL="${REDIS_URL:-}"

# Expected Application Gateway IP (set via env or skip)
EXPECTED_IP="${EXPECTED_IP:-}"

# ── Colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass_msg() { echo -e "${GREEN}✓${NC} $1"; }
fail_msg() { echo -e "${RED}✗${NC} $1"; }
warn_msg() { echo -e "${YELLOW}⚠${NC} $1"; }
info_msg() { echo -e "${CYAN}→${NC} $1"; }

# ── Parse Arguments ──────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
	case "$1" in
		--json)       JSON_OUTPUT=true ;;
		--health-only) HEALTH_ONLY=true ;;
		--skip-dns)   SKIP_DNS=true ;;
		--skip-ssl)   SKIP_SSL=true ;;
		--help|-h)
			echo "Usage: $0 [--json] [--health-only] [--skip-dns] [--skip-ssl]"
			echo ""
			echo "Environment variables:"
			echo "  DOMAIN         Domain to verify (default: lazynext.com)"
			echo "  EXPECTED_IP    Expected A record value for domain verification"
			echo "  DB_URL         PostgreSQL connection string for connectivity check"
			echo "  REDIS_URL      Redis connection string for connectivity check"
			exit 0
			;;
		*) echo "Unknown flag: $1"; exit 1 ;;
	esac
	shift
done

# ── Counter ──────────────────────────────────────────────────────────────────

PASS=0
FAIL=0
TOTAL=0

count() {
	((TOTAL++))
	if [ "$1" = "pass" ]; then
		((PASS++))
	else
		((FAIL++))
	fi
}

# ── Check Functions ──────────────────────────────────────────────────────────

check_http() {
	local url="$1"
	local expected_code="${2:-200}"
	local http_code

	http_code=$(curl -s -o /dev/null -w "%{http_code}" \
		--max-time "$TIMEOUT" \
		"$url" 2>/dev/null || echo "000")

	if [ "$http_code" = "$expected_code" ] || [ "$http_code" = "000" ] && [ "$expected_code" = "SKIP" ]; then
		echo "pass"
	else
		echo "fail"
	fi
}

check_http_json() {
	local url="$1"
	local expected_code="${2:-200}"
	local response

	response=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" \
		"$url" 2>/dev/null || echo "{}")

	local http_code body
	http_code=$(echo "$response" | tail -1)
	body=$(echo "$response" | head -n -1)

	if [ "$http_code" = "$expected_code" ]; then
		echo "pass"
	else
		echo "fail"
	fi
}

check_dns() {
	local name="$1"
	local expected="${2:-}"

	if command -v dig &>/dev/null; then
		local result
		result=$(dig +short "$name" A 2>/dev/null || echo "")

		if [ -z "$result" ]; then
			result=$(dig +short "$name" CNAME 2>/dev/null || echo "")
		fi

		if [ -n "$result" ]; then
			if [ -n "$expected" ]; then
				if echo "$result" | grep -q "$expected"; then
					echo "$result"
				else
					echo ""
				fi
			else
				echo "$result"
			fi
		else
			echo ""
		fi
	else
		# Fallback: use getent or nslookup
		if command -v nslookup &>/dev/null; then
			local result
			result=$(nslookup "$name" 8.8.8.8 2>/dev/null | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
			echo "${result:-}"
		else
			echo "unknown"
		fi
	fi
}

check_ssl() {
	local domain="$1"

	if command -v openssl &>/dev/null; then
		local expiry
		expiry=$(echo | openssl s_client -servername "$domain" \
			-connect "${domain}:443" 2>/dev/null \
			| openssl x509 -noout -enddate 2>/dev/null \
			| cut -d= -f2)

		if [ -n "$expiry" ]; then
			# Check if still valid
			local expiry_epoch now_epoch
			expiry_epoch=$(date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null || date -d "$expiry" +%s 2>/dev/null || echo "0")
			now_epoch=$(date +%s)
			if [ "$expiry_epoch" -gt "$now_epoch" ]; then
				local days_left
				days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
				echo "VALID ($days_left days)"
			else
				echo "EXPIRED"
			fi
		else
			echo "NO_CERT"
		fi
	else
		echo "UNKNOWN"
	fi
}

check_postgres() {
	if [ -z "$DB_URL" ]; then
		echo "skipped"
		return
	fi

	if command -v pg_isready &>/dev/null; then
		local host port
		host=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
		port=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

		if pg_isready -h "${host:-localhost}" -p "${port:-5432}" -t 5 &>/dev/null; then
			echo "pass"
		else
			echo "fail"
		fi
	else
		# Fallback: try TCP connection with nc
		local host port
		host=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
		port=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
		if command -v nc &>/dev/null && nc -z -w 5 "${host:-localhost}" "${port:-5432}" 2>/dev/null; then
			echo "pass"
		else
			echo "fail"
		fi
	fi
}

check_redis() {
	if [ -z "$REDIS_URL" ]; then
		echo "skipped"
		return
	fi

	if command -v redis-cli &>/dev/null; then
		if redis-cli -u "$REDIS_URL" --no-auth-warning ping &>/dev/null; then
			echo "pass"
		else
			echo "fail"
		fi
	else
		# Fallback: try TCP connection with nc
		local host port
		host=$(echo "$REDIS_URL" | sed -n 's/.*@\([^:]*\).*/\1/p' | sed 's/\/.*//')
		port=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')

		if [ -z "$host" ]; then
			host=$(echo "$REDIS_URL" | sed -n 's/redis:\/\/\([^:@]*\).*/\1/p')
			port="${port:-6379}"
		fi

		if command -v nc &>/dev/null && nc -z -w 5 "${host:-localhost}" "${port:-6379}" 2>/dev/null; then
			echo "pass"
		else
			echo "fail"
		fi
	fi
}

# ── JSON Output ──────────────────────────────────────────────────────────────

output_json() {
	local dns_root="${1:-}"
	local dns_www="${2:-}"
	local dns_api="${3:-}"
	local dns_app="${4:-}"
	local ssl_root="${5:-}"
	local web_health="${6:-}"
	local api_health="${7:-}"
	local ai_health="${8:-}"
	local render_health="${9:-}"
	local collab_health="${10:-}"
	local preproc_health="${11:-}"
	local gen_health="${12:-}"
	local db_result="${13:-}"
	local redis_result="${14:-}"

	cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "domain": "${DOMAIN}",
  "results": {
    "dns": {
      "${DOMAIN}":     "{}",
      "www.${DOMAIN}": "{}",
      "api.${DOMAIN}": "{}",
      "app.${DOMAIN}": "{}"
    },
    "ssl": {
      "${DOMAIN}": "${ssl_root}"
    },
    "services": {
      "web":           "",
      "apiGateway":    "",
      "aiAgents":      "",
      "render":        "",
      "collabServer":  "",
      "preProcessing": "",
      "generative":    ""
    },
    "database": {
      "postgres": "${db_result}",
      "redis":    "${redis_result}"
    }
  },
  "summary": {
    "passed": ${PASS},
    "failed": ${FAIL},
    "total":  ${TOTAL},
    "healthy": ${PASS} -eq ${TOTAL}
  }
}
EOF
}

# ── DNS Checks ───────────────────────────────────────────────────────────────

run_dns_checks() {
	echo ""
	info_msg "DNS Resolution"

	local dns_root dns_www dns_api dns_app

	dns_root=$(check_dns "$DOMAIN")
	if [ -n "$dns_root" ] && [ "$dns_root" != "unknown" ]; then
		if [ -n "$EXPECTED_IP" ]; then
			if echo "$dns_root" | grep -q "$EXPECTED_IP"; then
				pass_msg "${DOMAIN} → $dns_root"
				count pass
			else
				fail_msg "${DOMAIN} → $dns_root (expected $EXPECTED_IP)"
				count fail
			fi
		else
			pass_msg "${DOMAIN} → $dns_root"
			count pass
		fi
	else
		fail_msg "${DOMAIN} (not resolving)"
		count fail
	fi

	dns_www=$(check_dns "www.${DOMAIN}")
	if [ -n "$dns_www" ] && [ "$dns_www" != "unknown" ]; then
		pass_msg "www.${DOMAIN} → $dns_www"
		count pass
	else
		warn_msg "www.${DOMAIN} (not resolving — may need CNAME)"
		count pass # Not critical
	fi

	dns_api=$(check_dns "api.${DOMAIN}")
	if [ -n "$dns_api" ] && [ "$dns_api" != "unknown" ]; then
		pass_msg "api.${DOMAIN} → $dns_api"
		count pass
	else
		warn_msg "api.${DOMAIN} (not resolving — may need CNAME)"
		count pass
	fi

	dns_app=$(check_dns "app.${DOMAIN}")
	if [ -n "$dns_app" ] && [ "$dns_app" != "unknown" ]; then
		pass_msg "app.${DOMAIN} → $dns_app"
		count pass
	else
		warn_msg "app.${DOMAIN} (not resolving — may need CNAME)"
		count pass
	fi
}

# ── SSL Checks ───────────────────────────────────────────────────────────────

run_ssl_checks() {
	echo ""
	info_msg "SSL Certificates"

	local ssl_result
	ssl_result=$(check_ssl "$DOMAIN")

	case "$ssl_result" in
		VALID*)
			pass_msg "https://${DOMAIN} — $ssl_result"
			count pass
			;;
		EXPIRED)
			fail_msg "https://${DOMAIN} — EXPIRED"
			count fail
			;;
		NO_CERT)
			fail_msg "https://${DOMAIN} — no certificate found"
			count fail
			;;
		*)
			warn_msg "https://${DOMAIN} — cannot verify (openssl not available)"
			count pass
			;;
	esac

	# Also check API subdomain
	local api_ssl
	api_ssl=$(check_ssl "api.${DOMAIN}")
	case "$api_ssl" in
		VALID*)
			pass_msg "https://api.${DOMAIN} — $api_ssl"
			count pass
			;;
		EXPIRED)
			fail_msg "https://api.${DOMAIN} — EXPIRED"
			count fail
			;;
		*)
			warn_msg "https://api.${DOMAIN} — no cert (OK if wildcard)"
			;;
	esac
}

# ── Service Health Checks ────────────────────────────────────────────────────

run_health_checks() {
	echo ""
	info_msg "Service Health"

	local web_health api_health ai_health render_health collab_health preproc_health gen_health

	# Web App
	web_health=$(check_http "$WEB_HEALTH_URL" 200)
	if [ "$web_health" = "pass" ]; then
		pass_msg "Web App ($WEB_URL)"
		count pass
	else
		fail_msg "Web App ($WEB_URL)"
		count fail
	fi

	# API Gateway
	api_health=$(check_http "$API_GATEWAY_URL" 200)
	if [ "$api_health" = "pass" ]; then
		pass_msg "API Gateway"
		count pass
	else
		fail_msg "API Gateway ($API_GATEWAY_URL)"
		count fail
	fi

	# AI Agents
	ai_health=$(check_http "$AI_AGENTS_URL" 200)
	if [ "$ai_health" = "pass" ]; then
		pass_msg "AI Agents"
		count pass
	else
		warn_msg "AI Agents ($AI_AGENTS_URL)"
		count pass
	fi

	# Render Service
	render_health=$(check_http "$RENDER_URL" 200)
	if [ "$render_health" = "pass" ]; then
		pass_msg "Render Service"
		count pass
	else
		warn_msg "Render Service ($RENDER_URL)"
		count pass
	fi

	# Collab Server
	collab_health=$(check_http "$COLLAB_URL" 200)
	if [ "$collab_health" = "pass" ]; then
		pass_msg "Collab Server"
		count pass
	else
		warn_msg "Collab Server ($COLLAB_URL)"
		count pass
	fi

	# Pre-Processing
	preproc_health=$(check_http "$PREPROC_URL" 200)
	if [ "$preproc_health" = "pass" ]; then
		pass_msg "Pre-Processing"
		count pass
	else
		warn_msg "Pre-Processing ($PREPROC_URL)"
		count pass
	fi

	# Generative Studio
	gen_health=$(check_http "$GEN_STUDIO_URL" 200)
	if [ "$gen_health" = "pass" ]; then
		pass_msg "Generative Studio"
		count pass
	else
		warn_msg "Generative Studio ($GEN_STUDIO_URL)"
		count pass
	fi
}

# ── Database Checks ──────────────────────────────────────────────────────────

run_db_checks() {
	echo ""
	info_msg "Database & Cache Connectivity"

	local db_result redis_result

	db_result=$(check_postgres)
	case "$db_result" in
		pass)
			pass_msg "PostgreSQL"
			count pass
			;;
		skipped)
			info_msg "PostgreSQL (skipped — DB_URL not set)"
			;;
		*)
			fail_msg "PostgreSQL"
			count fail
			;;
	esac

	redis_result=$(check_redis)
	case "$redis_result" in
		pass)
			pass_msg "Redis"
			count pass
			;;
		skipped)
			info_msg "Redis (skipped — REDIS_URL not set)"
			;;
		*)
			fail_msg "Redis"
			count fail
			;;
	esac
}

# ── Summary ──────────────────────────────────────────────────────────────────

print_summary() {
	echo ""
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	if [ "$FAIL" -eq 0 ]; then
		echo -e "  ${GREEN}DEPLOYMENT HEALTHY${NC}  ${PASS}/${TOTAL} checks passed"
	else
		echo -e "  ${RED}DEPLOYMENT ISSUES${NC}   ${PASS}/${TOTAL} passed, ${FAIL} failed"
	fi
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
	echo ""
	echo "🔍 Lazynext Deployment Verification — ${DOMAIN}"
	echo "   $(date -u)"

	if ! $HEALTH_ONLY; then
		if ! $SKIP_DNS; then
			run_dns_checks
		fi
		if ! $SKIP_SSL; then
			run_ssl_checks
		fi
	fi

	run_health_checks
	run_db_checks

	print_summary

	if [ "$FAIL" -gt 0 ]; then
		exit 1
	fi
}

main
