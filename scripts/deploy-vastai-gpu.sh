#!/usr/bin/env bash
# Lazynext GPU — Deploy CosyVoice 3 + Wan 2.1 on vast.ai
# ──────────────────────────────────────────────────────────────────
# Prerequisites:
#   1. Sign up at https://vast.ai/console/account/
#   2. Get API key from https://vast.ai/console/account/
#   3. export VASTAI_API_KEY="your-key"
#   4. ./scripts/deploy-vastai-gpu.sh
#
# Cost: ~$0.20/hr for RTX 3090 (24GB VRAM)
# Runs CosyVoice 3 + Wan 2.1 self-hosted, unlimited generations
set -euo pipefail

VASTAI_API_KEY="${VASTAI_API_KEY:-}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[*]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }

if [ -z "$VASTAI_API_KEY" ]; then
	echo "Get API key: https://vast.ai/console/account/"
	echo "Then: export VASTAI_API_KEY=\"your-key\" && ./scripts/deploy-vastai-gpu.sh"
	exit 1
fi

info "Searching cheapest RTX 3090..."
OFFER=$(curl -s "https://vast.ai/api/v0/bundles?q=%7B%22gpu_name%22%3A%5B%22RTX+3090%22%5D%2C%22gpu_ram%22%3A%5B%2224%22%5D%2C%22disk_space%22%3A%5B%2250%22%5D%2C%22type%22%3A%22on-demand%22%2C%22sort%22%3A%5B%5B%22dph_total%22%2C1%5D%5D%7D" \
	| python3 -c "import json,sys; offers=json.load(sys.stdin)['offers']; print(json.dumps(offers[0]) if offers else '{}')")

MACHINE_ID=$(echo "$OFFER" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
PRICE=$(echo "$OFFER" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"\${d.get('dph_total',0):.2f}/hr\")")

if [ -z "$MACHINE_ID" ]; then
	echo "No GPU available. Try again later or check https://vast.ai/pricing"
	exit 1
fi

info "Found RTX 3090 at $PRICE — renting..."

# Create instance
INSTANCE=$(curl -s -X PUT "https://vast.ai/api/v0/asks/$MACHINE_ID/" \
	-H "Authorization: Bearer $VASTAI_API_KEY" \
	-d "client_id=me&image=ubuntu:24.04&disk=50&env={}&run_type=ssh&label=lazynext-gpu")

INSTANCE_ID=$(echo "$INSTANCE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('instance_id',''))" 2>/dev/null)

if [ -z "$INSTANCE_ID" ]; then
	echo "Failed to create instance: $INSTANCE"
	exit 1
fi

ok "Instance #$INSTANCE_ID created"

# Wait for SSH
info "Waiting for instance to start (30-60s)..."
sleep 30

# Get connection details
INSTANCE_DATA=$(curl -s "https://vast.ai/api/v0/instances?owner=me" \
	-H "Authorization: Bearer $VASTAI_API_KEY")

SSH_HOST=$(echo "$INSTANCE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['instances'][$INSTANCE_ID].get('ssh_host',''))" 2>/dev/null)
SSH_PORT=$(echo "$INSTANCE_DATA" | python3 -c "import json,sys; print(json.load(sys.stdin)['instances'][$INSTANCE_ID].get('ssh_port',''))" 2>/dev/null)

if [ -z "$SSH_HOST" ]; then
	echo "Instance still starting. Check: https://vast.ai/console/instances/"
	exit 1
fi

ok "GPU ready: ssh -p $SSH_PORT root@$SSH_HOST"

# Deploy CosyVoice 3 + Wan 2.1
info "Deploying AI models..."
ssh -p $SSH_PORT -o StrictHostKeyChecking=no root@$SSH_HOST bash -s <<'GPU_SETUP'
apt-get update -qq && apt-get install -y -qq git curl python3 python3-pip python3-venv ffmpeg 2>/dev/null

# Clone CosyVoice 3
git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git /opt/CosyVoice
cd /opt/CosyVoice
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt 2>/dev/null || true
pip install edge-tts fastapi uvicorn

# Download model
python3 -c "
from modelscope import snapshot_download
snapshot_download('FunAudioLLM/Fun-CosyVoice3-0.5B-2512', local_dir='/opt/models/CosyVoice3')
"

echo "GPU models deployed. Ready for API calls."
GPU_SETUP

GPU_IP="$SSH_HOST"
info "COSYVOICE_GPU_URL=http://$GPU_IP:8092"
info "TEXT2VIDEO_URL=http://$GPU_IP:8090"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GPU Instance Ready"
echo "  Instance: #$INSTANCE_ID"
echo "  Cost: $PRICE"
echo "  SSH: ssh -p $SSH_PORT root@$SSH_HOST"
echo ""
echo "  Add to main server:"
echo "  COSYVOICE_GPU_URL=http://$GPU_IP:8092"
echo "  TEXT2VIDEO_URL=http://$GPU_IP:8090"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
