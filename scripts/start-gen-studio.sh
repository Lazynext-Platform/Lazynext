#!/usr/bin/env bash
# Lazynext Generative Studio — Development Server
# Usage: ./start-gen-studio.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Environment ────────────────────────────────────────────────────
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-dev-secret-change-in-prod}"
export FAL_KEY="${FAL_KEY:-}"
export EDGE_TTS_VOICE="${EDGE_TTS_VOICE:-en-US-AvaNeural}"
export PYTHONUNBUFFERED=1

# ── Activate venv ─────────────────────────────────────────────────
VENV="$PROJECT_ROOT/services/generative-studio/.venv"
if [ ! -f "$VENV/bin/activate" ]; then
	echo "Creating venv..."
	python3 -m venv "$VENV"
	source "$VENV/bin/activate"
	pip install fastapi uvicorn pydantic httpx edge-tts pyjwt librosa soundfile numpy opencv-python
else
	source "$VENV/bin/activate"
fi

# ── Kill existing ─────────────────────────────────────────────────
lsof -ti:8001 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# ── Start ─────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Lazynext Generative Studio"
echo "  http://localhost:8001"
echo "  Edge TTS: $(python3 -c 'import edge_tts; print("READY")' 2>/dev/null || echo 'MISSING')"
echo "  Fal.ai:   $([ -n "$FAL_KEY" ] && echo 'CONFIGURED' || echo 'NOT SET')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_ROOT/services/generative-studio"
exec python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
