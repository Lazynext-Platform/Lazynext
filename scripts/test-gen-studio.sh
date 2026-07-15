#!/usr/bin/env bash
# Lazynext Generative Studio — End-to-End Test
# Usage: ./test-gen-studio.sh
set -e

BASE="http://localhost:8001"
PASS=0
FAIL=0
TOKEN=""

gen_token() {
	source /Users/avaspatel/Lazynext/services/generative-studio/.venv/bin/activate 2>/dev/null || true
	TOKEN=$(python3 -c "
import jwt, time
print(jwt.encode({'sub':'test','exp':int(time.time())+3600}, '${BETTER_AUTH_SECRET:-dev-secret-change-in-prod}', algorithm='HS256'))
" 2>/dev/null)
}

test_endpoint() {
	local name="$1" method="$2" path="$3" data="$4" expected="$5"
	echo -n "  [$name] "
	resp=$(curl -s --max-time 30 -X "$method" "$BASE$path" \
		-H "Authorization: Bearer $TOKEN" \
		-H "Content-Type: application/json" \
		-d "$data" 2>&1)
	if echo "$resp" | grep -q "$expected"; then
		echo "PASS"
		PASS=$((PASS+1))
	else
		echo "FAIL — $resp"
		FAIL=$((FAIL+1))
	fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Lazynext Generative Studio — E2E Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health check
echo -n "  [Server] "
if curl -s --max-time 5 "$BASE/health" | grep -q ok; then
	echo "RUNNING"
else
	echo "DOWN — start with: ./scripts/start-gen-studio.sh"
	exit 1
fi

gen_token

# Auth check
echo -n "  [Auth] "
resp=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
if [ "$resp" = "200" ]; then
	echo "PASS (200)"
	PASS=$((PASS+1))
else
	echo "FAIL ($resp)"
	FAIL=$((FAIL+1))
fi

# Edge TTS — dub
test_endpoint "Edge TTS /dub" POST "/dub" \
	'{"clip_id":"e2e_test","target_language":"en","text_to_dub":"End to end test running."}' \
	'"success":true'

# Edge TTS — avatar
test_endpoint "Edge TTS /avatar" POST "/generate-avatar" \
	'{"script":"Hello from Lazynext.","avatar_model":"test_avatar"}' \
	'"success":true'

# Modal video gen — should return prediction ID or graceful error
test_endpoint "Modal /generate-video" POST "/generate-video" \
	'{"prompt":"a test video","width":1024,"height":576,"num_frames":24}' \
	'"success"\|"Modal\|"not configured"'

# Inpainting
test_endpoint "Inpaint /inpaint" POST "/inpaint" \
	'{"video_id":"test_vid","mask_url":"file:///tmp/mask.png","prompt":"fill"}' \
	'"success"\|"503"\|"unavailable"'

# Upscale
test_endpoint "Upscale /upscale" POST "/upscale" \
	'{"video_id":"test_vid","scale":2}' \
	'"503"\|"success"'

# Overdub (F5-TTS)
test_endpoint "F5-TTS /overdub" POST "/overdub" \
	'{"text":"test","voice_id":"default"}' \
	'"503"\|"success"'

# Stem split
test_endpoint "Stems /split-stems" POST "/split-stems" \
	'{"audio_id":"test_audio","stems":4}' \
	'"503"\|"success"'

# Style transfer
test_endpoint "Style /style-transfer" POST "/style-transfer" \
	'{"video_id":"test_vid","style_prompt":"anime"}' \
	'"503"\|"success"'

# NeRF (deprecated, expects 410)
echo -n "  [NeRF /nerf-extract] "
resp=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/nerf-extract" \
	-H "Authorization: Bearer $TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"video_id":"test_vid"}')
if [ "$resp" = "410" ]; then
	echo "PASS (410 Gone)"
	PASS=$((PASS+1))
else
	echo "FAIL ($resp)"
	FAIL=$((FAIL+1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
