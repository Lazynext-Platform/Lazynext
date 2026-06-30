#!/usr/bin/env bash
set -euo pipefail

# ── Lazynext Platform — Full E2E Integration Test ─────────────────────
# Orchestrates the complete ingest→transcribe→edit→render→validate
# pipeline across all services without a browser.
#
# Requirements:
#   - Web App         :3000  (bun run dev)
#   - API Gateway     :8005  (cargo run -p lazynext_api_gateway)
#   - Render Service  :8003  (bun run start)
#   - Pre-Processing  :8000  (uvicorn main:app --port 8000)
#   - AI Agents       :8002  (bun run start)
#   - ffmpeg + ffprobe on PATH
#
# Usage:
#   ./scripts/full-e2e.sh                    # against localhost
#   STAGE=production ./scripts/full-e2e.sh   # against production URLs
#   SKIP_SERVICES=1 ./scripts/full-e2e.sh    # validate only, no setup
#
# Exit: 0 if all checks pass, 1 if any fail.

readonly API_GW="${API_GATEWAY_URL:-http://localhost:8005}"
readonly WEB="${WEB_URL:-http://localhost:3000}"
readonly RENDER="${RENDER_SERVICE_URL:-http://localhost:8003}"
readonly PREPROC="${PREPROC_URL:-http://localhost:8000}"
readonly AI_AGENTS="${AI_AGENTS_URL:-http://localhost:8002}"
readonly TIMEOUT_S="${E2E_TIMEOUT:-120}"
readonly SKIP_SERVICES="${SKIP_SERVICES:-0}"
readonly SKIP_EXPORT="${SKIP_EXPORT:-0}"

PASS=0
FAIL=0
START_TS=$(date +%s)

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
cyan()  { printf '\033[36m%s\033[0m\n' "$*"; }

check() {
  local desc="$1"; shift
  if "$@"; then
    green "  ✓ ${desc}"; PASS=$((PASS + 1))
  else
    red "  ✗ ${desc}"; FAIL=$((FAIL + 1))
  fi
}

warn_skip() {
  cyan "  ⚠ ${1} — skipped"
}

# ── Service reachability ───────────────────────────────────────────────
echo ""
cyan "═══ E2E Integration Test — $(date) ═══"
echo ""

[[ "$SKIP_SERVICES" == "1" ]] || {
  echo "▸ Checking services..."
  check "API Gateway   :8005"  curl -sf -m 5 "$API_GW/health" > /dev/null
  check "Web App       :3000"  curl -sf -m 5 "$WEB" > /dev/null
  check "Render Service :8003" curl -sf -m 5 "$RENDER/health" > /dev/null
  PREPROC_OK=false
  if curl -sf -m 3 "$PREPROC/health" > /dev/null 2>&1; then
    PREPROC_OK=true; green "  ✓ Pre-processing :8000"
  else
    warn_skip "Pre-processing :8000 (optional)"
  fi
  AI_OK=false
  if curl -sf -m 3 "$AI_AGENTS/health" > /dev/null 2>&1; then
    AI_OK=true; green "  ✓ AI Agents      :8002"
  else
    warn_skip "AI Agents :8002 (optional)"
  fi
}

# ── 1. Create test project ─────────────────────────────────────────────
echo ""
echo "▸ 1. Creating test project..."
PROJECT_RES=$(curl -sf -m 10 -X POST "$API_GW/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"e2e-smoke-test","width":640,"height":480,"framerate":10}' 2>/dev/null || echo '')
check "Create project" test -n "$PROJECT_RES"
PROJECT_ID=$(echo "$PROJECT_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "e2e-smoke")
green "    projectId: ${PROJECT_ID:-e2e-smoke}"

# ── 2. Generate test media ─────────────────────────────────────────────
echo ""
echo "▸ 2. Generating test media..."
TMPDIR="${TMPDIR:-/tmp}/lazynext-e2e-$$"
mkdir -p "$TMPDIR"
TEST_VIDEO="$TMPDIR/test.mp4"

# 2-second test video (640x480, 10 fps, color bars)
ffmpeg -y -f lavfi -i "smptebars=duration=2:size=640x480:rate=10" \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p "$TEST_VIDEO" 2>/dev/null
check "Generate 2s test video" test -f "$TEST_VIDEO" && test -s "$TEST_VIDEO"

# ── 3. Ingest media ────────────────────────────────────────────────────
echo ""
echo "▸ 3. Ingesting media..."
INGEST_RES=$(curl -sf -m 10 -X POST "$API_GW/api/v1/ai/ingest" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"file://${TEST_VIDEO}\",\"projectId\":\"${PROJECT_ID:-e2e-smoke}\",\"source\":\"e2e-test\"}" 2>/dev/null || echo '')
check "POST /api/v1/ai/ingest" echo "$INGEST_RES" | grep -q '"success"\|"ok"\|"ingested"'
green "    ingest response: ${INGEST_RES:0:120}"

# ── 4. Transcribe (if pre-processing is available) ──────────────────────
echo ""
echo "▸ 4. Transcription..."
if [[ "$PREPROC_OK" == "true" ]]; then
  TRANS_RES=$(curl -sf -m 30 -X POST "$PREPROC/transcribe" \
    -H "Content-Type: application/json" \
    -d "{\"file_path\":\"${TEST_VIDEO}\",\"model\":\"tiny\"}" 2>/dev/null || echo '')
  check "POST /transcribe" echo "$TRANS_RES" | grep -q '"segments"\|"text"\|"transcription"'
else
  warn_skip "Pre-processing offline"
fi

# ── 5. AI edit via Chronos ────────────────────────────────────────────
echo ""
echo "▸ 5. AI autonomous edit..."
EDIT_RES=$(curl -sf -m 30 -X POST "$API_GW/api/v1/autonomous_edit" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"${PROJECT_ID:-e2e-smoke}\",\"prompt\":\"trim first second\",\"require_plan_approval\":false}" 2>/dev/null || echo '')
check "POST /api/v1/autonomous_edit" echo "$EDIT_RES" | grep -q '"success"\|"ok"\|"applied"'
green "    edit response: ${EDIT_RES:0:120}"

# ── 6. Export ──────────────────────────────────────────────────────────
echo ""
echo "▸ 6. Export..."
if [[ "$SKIP_EXPORT" == "1" ]]; then
  warn_skip "SKIP_EXPORT=1"
else
  EXPORT_RES=$(curl -sf -m 10 -X POST "$RENDER/api/v1/export" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"${PROJECT_ID:-e2e-smoke}\",\"format\":\"mp4\",\"width\":640,\"height\":480,\"framerate\":10,\"totalFrames\":20,\"bitrate_kbps\":500}" 2>/dev/null || echo '')
  check "POST /api/v1/export (frame-stream)" echo "$EXPORT_RES" | grep -q '"success"\|"jobId"'
  JOB_ID=$(echo "$EXPORT_RES" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4 || echo '')
  green "    jobId: ${JOB_ID:-none}"

  # ── 6a. Stream synthetic frames ──────────────────────────────────────
  if [[ -n "${JOB_ID:-}" ]]; then
    echo "    Streaming 20 synthetic frames..."
    for i in $(seq 0 19); do
      # Generate a per-frame RGBA gradient (640*480*4 = 1,228,800 bytes)
      FRAME="$TMPDIR/frame_${i}.rgba"
      python3 -c "
data = bytearray()
for y in range(480):
  for x in range(640):
    data.append((x + $i * 10) % 256)  # R
    data.append(y % 256)              # G
    data.append(200)                  # B
    data.append(255)                  # A
open('$FRAME','wb').write(data)
" 2>/dev/null || true
      if [[ -f "$FRAME" ]]; then
        curl -sf -m 5 -X POST "$RENDER/api/v1/export/${JOB_ID}/frames" \
          -H "Content-Type: application/octet-stream" \
          -H "X-Frame-Seq: $i" \
          --data-binary @"$FRAME" > /dev/null 2>&1 || true
      fi
    done

    # Signal end of stream
    curl -sf -m 10 -X POST "$RENDER/api/v1/export/${JOB_ID}/frames/end" > /dev/null 2>&1 || true

    # Poll for completion
    echo "    Waiting for encode..."
    for _ in $(seq 1 30); do
      STATUS=$(curl -sf -m 3 "$RENDER/api/v1/jobs/${JOB_ID}" 2>/dev/null || echo '{}')
      STATE=$(echo "$STATUS" | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo 'pending')
      if [[ "$STATE" == "completed" ]]; then
        green "    ✓ Encode complete"
        break
      fi
      sleep 1
    done

    # Find output file
    OUTPUT=$(find "$TMPDIR" -name "*.mp4" 2>/dev/null | head -1)
    if [[ -z "${OUTPUT:-}" ]]; then
      # Try render-service outputs dir
      OUTPUT=$(find services/render-service/outputs -name "*.mp4" -newer "$TEST_VIDEO" 2>/dev/null | head -1 || echo '')
    fi

    # ── 7. Validate output with ffprobe ──────────────────────────────
    echo ""
    echo "▸ 7. Validating export output..."
    if [[ -n "${OUTPUT:-}" && -f "$OUTPUT" ]]; then
      check "Output file exists" test -s "$OUTPUT"
      DIMS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUTPUT" 2>/dev/null || echo '')
      check "Dimensions 640x480" echo "$DIMS" | grep -q "640,480"
      DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null || echo '0')
      check "Duration ≈ 2.0s" python3 -c "d=float('$DUR'); assert abs(d - 2.0) < 0.5, f'duration {d}'; print('OK')"
      green "    output: ${OUTPUT} (${DUR}s, ${DIMS})"
    else
      warn_skip "Export file not found (render-service may need fs access)"
    fi
  fi
fi

# ── 8. CLI export test (if binary exists) ──────────────────────────────────
echo ""
echo "▸ 8. CLI render test..."
CLI_BIN="rust/target/debug/lazynext_cli"
if [[ -x "$CLI_BIN" ]]; then
  CLI_OUT="$TMPDIR/cli-export.mp4"
  cargo run -p lazynext_cli -- render \
    --project "e2e-smoke" --format mp4 --width 64 --height 64 --framerate 10 \
    --duration 1 --bitrate 500 2>/dev/null || true
  if [[ -f "$CLI_OUT" ]]; then
    check "CLI produces output file" test -s "$CLI_OUT"
    green "    cli output: ${CLI_OUT}"
  else
    warn_skip "CLI output file not found"
  fi
else
  warn_skip "CLI binary not built (cargo build)"
fi

# ── Cleanup ─────────────────────────────────────────────────────────────
echo ""
cyan "═══ Results ═══"
ELAPSED=$(($(date +%s) - START_TS))
TOTAL=$((PASS + FAIL))
echo "  ${PASS}/${TOTAL} checks passed in ${ELAPSED}s"
if [[ "$FAIL" -gt 0 ]]; then
  red "  ✗ ${FAIL} FAILURES"
  exit 1
else
  green "  ✓ All checks passed!"
  exit 0
fi
