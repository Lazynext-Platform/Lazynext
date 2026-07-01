#!/usr/bin/env bash
# health-check.sh — Check health of all Lazynext services
# Usage:
#   ./scripts/health-check.sh           # Check all services
#   ./scripts/health-check.sh --watch   # Watch mode (every 10s)
#   ./scripts/health-check.sh --json    # JSON output for monitoring
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

WEB_URL="${WEB_URL:-http://localhost:3000}"
PRE_PROCESSING_URL="${PRE_PROCESSING_URL:-http://localhost:8000}"
GENERATIVE_STUDIO_URL="${GENERATIVE_STUDIO_URL:-http://localhost:8001}"
AI_AGENTS_URL="${AI_AGENTS_URL:-http://localhost:8002}"
RENDER_SERVICE_URL="${RENDER_SERVICE_URL:-http://localhost:8003}"
DB_URL="${DB_URL:?Set DB_URL env var}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

TIMEOUT=10
JSON_OUTPUT=false
WATCH_MODE=false

# ── Parse Args ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUTPUT=true ;;
    --watch) WATCH_MODE=true ;;
    --help|-h)
      echo "Usage: $0 [--json] [--watch]"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── Check Functions ─────────────────────────────────────────────────────────

check_http() {
  local url="$1"
  local name="$2"
  local path="${3:-/}"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${url}${path}" 2>/dev/null || echo "000")

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 500 ]; then
    echo "healthy"
  else
    echo "unhealthy"
  fi
}

check_postgres() {
  if command -v pg_isready &>/dev/null; then
    # Extract host/port from URL
    local host port
    host=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    port=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

    if pg_isready -h "${host:-localhost}" -p "${port:-5432}" -t 5 &>/dev/null; then
      echo "healthy"
    else
      echo "unhealthy"
    fi
  else
    echo "unknown"
  fi
}

check_redis() {
  if command -v redis-cli &>/dev/null; then
    if redis-cli -u "$REDIS_URL" ping &>/dev/null; then
      echo "healthy"
    else
      echo "unhealthy"
    fi
  else
    echo "unknown"
  fi
}

# ── Collect Status ──────────────────────────────────────────────────────────

collect_status() {
  local web_status pre_status gen_status ai_status render_status db_status redis_status

  web_status=$(check_http "$WEB_URL" "Web App" "/api/health")
  pre_status=$(check_http "$PRE_PROCESSING_URL" "Pre-Processing" "/")
  gen_status=$(check_http "$GENERATIVE_STUDIO_URL" "Generative Studio" "/")
  ai_status=$(check_http "$AI_AGENTS_URL" "AI Agents" "/health")
  render_status=$(check_http "$RENDER_SERVICE_URL" "Render Service" "/health")
  db_status=$(check_postgres)
  redis_status=$(check_redis)

  if [ "$JSON_OUTPUT" = true ]; then
    cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services": {
    "web":           { "url": "$WEB_URL",             "status": "$web_status" },
    "preProcessing": { "url": "$PRE_PROCESSING_URL",   "status": "$pre_status" },
    "generative":    { "url": "$GENERATIVE_STUDIO_URL", "status": "$gen_status" },
    "aiAgents":      { "url": "$AI_AGENTS_URL",        "status": "$ai_status" },
    "render":        { "url": "$RENDER_SERVICE_URL",   "status": "$render_status" },
    "postgres":      { "url": "$DB_URL",               "status": "$db_status" },
    "redis":         { "url": "$REDIS_URL",            "status": "$redis_status" }
  }
}
EOF
  else
    local format="%-25s %-12s %s\n"
    printf "\n🔍 Lazynext Health Check — $(date)\n\n"
    printf "$format" "SERVICE" "STATUS" "URL"
    printf "$format" "-------------------------" "------------" "----------------------------"
    printf "$format" "Web App" "$web_status" "$WEB_URL"
    printf "$format" "Pre-Processing" "$pre_status" "$PRE_PROCESSING_URL"
    printf "$format" "Generative Studio" "$gen_status" "$GENERATIVE_STUDIO_URL"
    printf "$format" "AI Agents" "$ai_status" "$AI_AGENTS_URL"
    printf "$format" "Render Service" "$render_status" "$RENDER_SERVICE_URL"
    printf "$format" "PostgreSQL" "$db_status" "$DB_URL"
    printf "$format" "Redis" "$redis_status" "$REDIS_URL"

    # Summary
    local total=7 healthy=0
    for s in "$web_status" "$pre_status" "$gen_status" "$ai_status" "$render_status" "$db_status" "$redis_status"; do
      [ "$s" = "healthy" ] && ((healthy++))
    done
    printf "\n📊 %d/%d services healthy\n\n" "$healthy" "$total"

    if [ "$healthy" -lt "$total" ]; then
      exit 1
    fi
  fi
}

# ── Main ────────────────────────────────────────────────────────────────────

if [ "$WATCH_MODE" = true ]; then
  echo "👀 Watching services every 10s... (Ctrl+C to stop)"
  while true; do
    clear
    collect_status
    sleep 10
  done
else
  collect_status
fi
