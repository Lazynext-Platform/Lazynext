#!/usr/bin/env bash
# demo.sh — Lazynext End-to-End Demo Launcher
# Starts all services, waits for health, opens browser, prints AI copilot instructions.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

TIMEOUT_SECONDS=300
POLL_INTERVAL=5

echo ""
echo -e "${BOLD}${CYAN}⚡ Lazynext — Enterprise AI-Native NLE${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Check Prerequisites ──────────────────────────────────────────────

echo -e "${BOLD}[1/6] Checking prerequisites...${NC}"

failures=0

check_cmd() {
	local name="$1"
	local cmd="$2"
	local hint="${3:-}"
	if command -v "$cmd" &>/dev/null; then
		local ver
		ver=$("$cmd" --version 2>&1 | head -1 || echo "installed")
		echo -e "  ${GREEN}✓${NC} $name — $ver"
	else
		echo -e "  ${RED}✗${NC} $name — NOT FOUND${hint:+ ($hint)}"
		((failures++)) || true
	fi
}

check_cmd "Docker"     "docker" "Required: https://docs.docker.com/get-docker/"
check_cmd "Docker Compose" "docker" "docker compose subcommand"
check_cmd "Rust"       "rustc"  "Required 1.96+: https://rustup.rs"
check_cmd "Bun"        "bun"    "Required 1.3+: https://bun.sh"
check_cmd "Node"       "node"   "Required 20+: https://nodejs.org"
check_cmd "Python"     "python3" "Required 3.13+: https://python.org"

if [ "$failures" -gt 0 ]; then
	echo ""
	echo -e "${RED}Failed: $failures prerequisite(s) missing.${NC}"
	echo "Install missing dependencies and re-run this script."
	exit 1
fi

echo -e "  ${GREEN}All prerequisites satisfied.${NC}"
echo ""

# ── Step 2: Build WASM Bridge ────────────────────────────────────────────────

echo -e "${BOLD}[2/6] Building WASM bridge...${NC}"

WASM_PKG="rust/wasm/pkg/lazynext_wasm.js"
WASM_NEEDS_BUILD=false

if [ ! -f "$WASM_PKG" ]; then
	WASM_NEEDS_BUILD=true
	echo "  WASM package not found. Building..."
elif [ -f "./build-wasm.sh" ] && [ rust/wasm/Cargo.toml -nt "$WASM_PKG" ]; then
	WASM_NEEDS_BUILD=true
	echo "  Source changed since last build. Rebuilding..."
fi

if [ "$WASM_NEEDS_BUILD" = true ]; then
	if [ -f "./build-wasm.sh" ]; then
		./build-wasm.sh
	else
		echo -e "  ${YELLOW}⚠${NC}  build-wasm.sh not found. Running wasm-pack directly..."
		(cd rust/wasm && wasm-pack build --target web --out-dir pkg)
	fi
	echo -e "  ${GREEN}✓${NC} WASM bridge built."
else
	echo -e "  ${GREEN}✓${NC} WASM bridge up-to-date."
fi

echo ""

# ── Step 3: Start All Services ───────────────────────────────────────────────

echo -e "${BOLD}[3/6] Starting all 9 services via docker-compose...${NC}"

# Stop and clean up any previous demo
docker compose down --remove-orphans 2>/dev/null || true

echo "  Building images and starting containers..."
docker compose up --build -d 2>&1 | tail -5

echo -e "  ${GREEN}✓${NC} docker-compose up initiated."
echo ""

# ── Step 4: Wait for Health Checks ───────────────────────────────────────────

echo -e "${BOLD}[4/6] Waiting for all services to become healthy...${NC}"
echo "  (This may take 2-4 minutes on first run — pulling images, compiling, ML model warm-up)"
echo ""

SERVICES=(
	"db:5432:pg_isready -U lazynext -d lazynext:docker exec lazynext-db-1"
	"redis:6379:redis-cli ping:docker exec lazynext-redis-1"
	"api-gateway:8005:curl -sf http://localhost:8005/health:"
	"pre-processing:8000:curl -sf http://localhost:8000/health:"
	"generative-studio:8001:curl -sf http://localhost:8001/health:"
	"ai-agents:8002:curl -sf http://localhost:8002/health:"
	"render-service:8003:curl -sf http://localhost:8003/health:"
	"collab-server:8004:curl -sf http://localhost:8004/health:"
	"web:3000:curl -sf http://localhost:3000/api/health:"
	"analytics-service:8006:curl -sf http://localhost:8006/health:"
	"social-publish:8007:curl -sf http://localhost:8007/health:"
)

start_time=$(date +%s)
declare -A service_healthy

while true; do
	all_healthy=true

	for entry in "${SERVICES[@]}"; do
		IFS=':' read -r name port check_cmd docker_prefix <<< "$entry"

		if [ "${service_healthy[$name]:-}" = "true" ]; then
			continue
		fi

		if eval "${check_cmd:-true}" &>/dev/null; then
			service_healthy[$name]="true"
			echo -e "  ${GREEN}✓${NC} $name (port $port) — healthy"
		else
			all_healthy=false
		fi
	done

	if [ "$all_healthy" = true ]; then
		break
	fi

	elapsed=$(( $(date +%s) - start_time ))
	if [ "$elapsed" -gt "$TIMEOUT_SECONDS" ]; then
		echo ""
		echo -e "${RED}Timeout ($TIMEOUT_SECONDS s) waiting for services.${NC}"
		echo "Check logs: docker compose logs"

		# Show which failed
		for entry in "${SERVICES[@]}"; do
			IFS=':' read -r name port check_cmd docker_prefix <<< "$entry"
			if [ "${service_healthy[$name]:-}" != "true" ]; then
				echo -e "  ${RED}✗${NC} $name — still unhealthy"
			fi
		done
		exit 1
	fi

	printf "\r  Waiting... (%s s elapsed) " "$elapsed"
	sleep "$POLL_INTERVAL"
done

echo ""
echo -e "  ${GREEN}✓${NC} All services healthy!"
echo ""

# ── Step 5: Print Service URLs & Health ──────────────────────────────────────

echo -e "${BOLD}[5/6] Service URLs & Status:${NC}"
echo ""

format="  %-22s %-12s %s\n"
printf "$format" "SERVICE" "PORT" "URL"
printf "$format" "----------------------" "------------" "-----------------------------------"
printf "$format" "Web App"              "3000"        "http://localhost:3000"
printf "$format" "Pre-Processing"       "8000"        "http://localhost:8000"
printf "$format" "Generative Studio"    "8001"        "http://localhost:8001"
printf "$format" "AI Agents (Chronos)"  "8002"        "http://localhost:8002"
printf "$format" "Render Service"       "8003"        "http://localhost:8003"
printf "$format" "Collab Server"        "8004"        "http://localhost:8004"
printf "$format" "API Gateway"          "8005"        "http://localhost:8005"
printf "$format" "Analytics Service"    "8006"        "http://localhost:8006"
printf "$format" "Social Publish"       "8007"        "http://localhost:8007"
echo ""
printf "$format" "Observability"        "—"           "—"
printf "$format" "Grafana"              "3001"        "http://localhost:3001 (admin/admin)"
printf "$format" "Prometheus"           "9090"        "http://localhost:9090"
printf "$format" "Swagger UI"           "8005"        "http://localhost:8005/swagger-ui"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All systems ready. Launching web app...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 6: Open Browser & Print Testing Instructions ─────────────────────────

echo -e "${BOLD}[6/6] Opening browser & printing instructions...${NC}"
echo ""

# Try to open the web app in the default browser
if command -v open &>/dev/null; then
	open "http://localhost:3000" 2>/dev/null || true
elif command -v xdg-open &>/dev/null; then
	xdg-open "http://localhost:3000" 2>/dev/null || true
fi

cat << 'INSTRUCTIONS'
┌─────────────────────────────────────────────────────────────────────┐
│                 🎬  Chronos AI Copilot — Quick Test                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Open http://localhost:3000 in your browser                      │
│                                                                     │
│  2. Sign up or sign in (local dev auth)                             │
│                                                                     │
│  3. Create a new project or open an existing one                    │
│                                                                     │
│  4. Open the Chronos Copilot panel (Cmd+K or click the AI icon)     │
│                                                                     │
│  5. Try these natural language commands:                            │
│                                                                     │
│     📝 "Cut the silence from all audio tracks"                      │
│     🎨 "Apply a cinematic color grade to track 1"                   │
│     🔀 "Add a crossfade transition between clips 3 and 4"          │
│     ✂️ "Trim the first 2 seconds from every clip"                  │
│     📐 "Auto-reframe for Instagram Reel (9:16)"                    │
│     🎵 "Lower background music volume by 10dB during speech"        │
│                                                                     │
│  6. Watch the AI generate a plan, review, then execute              │
│                                                                     │
│  7. Export your timeline: File → Export → choose format             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  🧪  API Gateway (JWT-protected)                                   │
│                                                                     │
│  Swagger UI:  http://localhost:8005/swagger-ui                      │
│  Health:      curl http://localhost:8005/health                     │
│  Projects:    curl -H "Authorization: Bearer <token>" \             │
│                    http://localhost:8005/api/v1/projects            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  📊  Monitoring                                                   │
│                                                                     │
│  Grafana:     http://localhost:3001 (admin / admin)                 │
│  Prometheus:  http://localhost:9090                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  🛑  Stop the demo:                                                │
│                                                                     │
│  docker compose down                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
INSTRUCTIONS

echo ""
echo -e "${BOLD}Demo is live! Press Ctrl+C here to kill containers, or run:${NC}"
echo -e "  ${CYAN}docker compose down${NC}"
echo ""

# Keep the script alive so the user can see the output
# and Ctrl+C to stop containers (trap below)

stop_demo() {
	echo ""
	echo -e "${YELLOW}Stopping Lazynext demo...${NC}"
	docker compose down
	echo -e "${GREEN}Demo stopped.${NC}"
	exit 0
}

trap stop_demo SIGINT SIGTERM

# Wait indefinitely
while true; do sleep 1; done
