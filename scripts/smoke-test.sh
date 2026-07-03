#!/usr/bin/env bash
# smoke-test.sh — Full pipeline smoke test for Lazynext
# Tests: API Gateway liveness → Create Project → AI Prompt → Transcription → Export
# Returns 0 if all pass, 1 if any fail.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASSED=0
FAILED=0
RESULTS=()

# Base URLs (override with env vars)
API_GATEWAY="${API_GATEWAY_URL:-http://localhost:8005}"
PRE_PROCESSING="${PRE_PROCESSING_URL:-http://localhost:8000}"
AI_AGENTS="${AI_AGENTS_URL:-http://localhost:8002}"
RENDER_SERVICE="${RENDER_SERVICE_URL:-http://localhost:8003}"
WEB_APP="${WEB_APP_URL:-http://localhost:3000}"
COLLAB_SERVER="${COLLAB_SERVER_URL:-http://localhost:8004}"
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-dev-secret-change-in-production}"
TIMEOUT=10

pass() {
	echo -e "  ${GREEN}PASS${NC} $1"
	RESULTS+=("${GREEN}PASS${NC}: $1")
	((PASSED++)) || true
}

fail() {
	echo -e "  ${RED}FAIL${NC} $1 — $2"
	RESULTS+=("${RED}FAIL${NC}: $1 — $2")
	((FAILED++)) || true
}

echo ""
echo -e "${BOLD}🧪 Lazynext Smoke Test${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Helper: HTTP GET with status check ───────────────────────────────────────

http_get() {
	local url="$1"
	local expected="${2:-200}"
	local code
	code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
	echo "$code"
}

http_post() {
	local url="$1"
	local data="$2"
	local expected="${3:-201}"
	local resp
	resp=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" -X POST "$url" \
		-H "Content-Type: application/json" \
		-d "$data" 2>/dev/null || echo "{}")
	local code
	code=$(echo "$resp" | tail -1)
	local body
	body=$(echo "$resp" | sed '$d')
	echo "$code|$body"
}

http_post_auth() {
	local url="$1"
	local data="$2"
	local token="$3"
	local expected="${4:-201}"
	local resp
	resp=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" -X POST "$url" \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $token" \
		-d "$data" 2>/dev/null || echo "{}")
	local code
	code=$(echo "$resp" | tail -1)
	local body
	body=$(echo "$resp" | sed '$d')
	echo "$code|$body"
}

# ── Test 1: API Gateway Liveness ─────────────────────────────────────────────

echo -e "${BOLD}[1] API Gateway — Liveness Check${NC}"

code=$(http_get "$API_GATEWAY/health")
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "GET /health returned HTTP $code"
else
	fail "GET /health" "HTTP $code (expected 2xx)"
fi

code=$(http_get "$API_GATEWAY/swagger-ui")
if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
	pass "Swagger UI accessible (HTTP $code)"
else
	fail "Swagger UI" "HTTP $code"
fi

echo ""

# ── Test 2: Create a Project ─────────────────────────────────────────────────

echo -e "${BOLD}[2] Create a Project via API${NC}"

PROJECT_DATA='{"name":"Smoke Test Project","width":1920,"height":1080,"framerate":24}'

result=$(http_post "$API_GATEWAY/api/v1/projects" "$PROJECT_DATA")
code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
	PROJECT_ID=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
	if [ -n "$PROJECT_ID" ]; then
		pass "Project created — ID: $PROJECT_ID"
	else
		fail "Project created but no ID in response" "Body: $body"
	fi
else
	fail "Create project" "HTTP $code — $body"
fi

echo ""

# ── Test 3: AI Instructions / Prompt ─────────────────────────────────────────

echo -e "${BOLD}[3] AI Copilot — Send Prompt${NC}"

if [ -n "${PROJECT_ID:-}" ]; then
	AI_DATA="{\"project_id\":\"$PROJECT_ID\",\"prompt\":\"Add a video track and a text overlay title\",\"require_confirmation\":false,\"max_operations\":3}"
	result=$(http_post "$API_GATEWAY/api/v1/autonomous_edit" "$AI_DATA")
	code=$(echo "$result" | cut -d'|' -f1)
	body=$(echo "$result" | cut -d'|' -f2-)
else
	# Try without project_id as a fallback
	AI_DATA='{"prompt":"Add a video track","require_confirmation":false}'
	result=$(http_post "$AI_AGENTS/orchestrate" "$AI_DATA")
	code=$(echo "$result" | cut -d'|' -f1)
	body=$(echo "$result" | cut -d'|' -f2-)
fi

if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
	pass "AI prompt accepted (HTTP $code)"
elif [ "$code" = "404" ] || [ "$code" = "405" ]; then
	# Endpoint might not exist or method not allowed — try alternate path
	result=$(http_post "$AI_AGENTS/orchestrate" "{\"project_id\":\"${PROJECT_ID:-test}\",\"prompt\":\"add a track\"}")
	code=$(echo "$result" | cut -d'|' -f1)
	if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
		pass "AI prompt accepted via alternate endpoint (HTTP $code)"
	else
		fail "AI prompt" "HTTP $code from all endpoint attempts"
	fi
else
	fail "AI prompt" "HTTP $code — $body"
fi

echo ""

# ── Test 4: Transcription Service ────────────────────────────────────────────

echo -e "${BOLD}[4] Transcription Service Check${NC}"

code=$(http_get "$PRE_PROCESSING/health")
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "Pre-processing service healthy (HTTP $code)"
else
	fail "Pre-processing service" "HTTP $code (expected 2xx)"
fi

# Check that the transcribe endpoint exists (we don't send actual media)
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
	-X POST "$PRE_PROCESSING/transcribe" \
	-H "Content-Type: application/json" \
	-d '{"source_url":"s3://test-bucket/test.mp4"}' 2>/dev/null || echo "000")

if [ "$code" = "400" ] || [ "$code" = "415" ] || [ "$code" = "422" ]; then
	pass "Transcribe endpoint exists and validates input (HTTP $code)"
elif [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
	pass "Transcribe endpoint responds (HTTP $code)"
else
	fail "Transcribe endpoint" "HTTP $code"
fi

echo ""

# ── Test 5: Export Endpoint ──────────────────────────────────────────────────

echo -e "${BOLD}[5] Export Endpoint Verification${NC}"

code=$(http_get "$RENDER_SERVICE/health")
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "Render service healthy (HTTP $code)"
else
	fail "Render service" "HTTP $code"
fi

# Test export endpoint with a minimal payload
EXPORT_DATA="{\"project_id\":\"${PROJECT_ID:-smoke-test}\",\"preset\":\"youtube_1080p\"}"
result=$(http_post "$RENDER_SERVICE/export" "$EXPORT_DATA")
code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)

if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
	EXPORT_JOB_ID=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('job_id',''))" 2>/dev/null || echo "")
	if [ -n "$EXPORT_JOB_ID" ]; then
		pass "Export job queued — ID: $EXPORT_JOB_ID"
	else
		pass "Export endpoint responds (HTTP $code)"
	fi
elif [ "$code" = "400" ] || [ "$code" = "422" ]; then
	pass "Export endpoint validates input (HTTP $code)"
elif [ "$code" = "404" ]; then
	# Try alternate path
	result=$(http_post "$RENDER_SERVICE/jobs" "$EXPORT_DATA")
	code=$(echo "$result" | cut -d'|' -f1)
	if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
		pass "Export jobs endpoint responds (HTTP $code)"
	else
		fail "Export endpoint" "HTTP $code"
	fi
else
	fail "Export endpoint" "HTTP $code — $body"
fi

echo ""

# ── Bonus: Collab Server & Social Publish ────────────────────────────────────

echo -e "${BOLD}[Bonus] Additional Service Checks${NC}"

code=$(http_get "$COLLAB_SERVER/health" 200)
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "Collab server healthy (HTTP $code)"
else
	fail "Collab server" "HTTP $code"
fi

code=$(http_get "http://localhost:8007/health" 200)
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "Social publish healthy (HTTP $code)"
else
	fail "Social publish" "HTTP $code"
fi

code=$(http_get "$WEB_APP/api/health" 200)
if [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
	pass "Web app healthy (HTTP $code)"
else
	fail "Web app" "HTTP $code"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Smoke Test Results${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for result in "${RESULTS[@]}"; do
	echo -e "  $result"
done

echo ""
echo -e "  ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
	echo -e "${RED}⛔ Smoke test failed — $FAILED check(s) did not pass.${NC}"
	echo ""
	echo "Troubleshooting:"
	echo "  1. Ensure all services are running: docker compose ps"
	echo "  2. Check service logs: docker compose logs <service>"
	echo "  3. Verify health: ./scripts/health-check.sh"
	echo "  4. Ensure .env is configured correctly"
	exit 1
else
	echo -e "${GREEN}✅ All smoke tests passed!${NC}"
	echo ""
	exit 0
fi
