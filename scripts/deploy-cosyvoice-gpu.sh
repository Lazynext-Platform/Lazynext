#!/usr/bin/env bash
# Lazynext CosyVoice 3 — GPU Instance Provisioning (Linode)
# ──────────────────────────────────────────────────────────────────
# This script runs ONCE on a NEW Linode GPU instance (RTX 4000 Ada)
# to provision it for CosyVoice 3 voice cloning.
#
# Usage (from your local machine):
#   1. Create a Linode GPU instance via dashboard
#   2. Copy this script: scp deploy-cosyvoice-gpu.sh root@<GPU_IP>:/root/
#   3. SSH in and run: ssh root@<GPU_IP> "bash /root/deploy-cosyvoice-gpu.sh"
#   4. Note the GPU IP and update COSYVOICE_GPU_URL on main server
#
# Expected: Ubuntu 24.04 LTS, RTX 4000 Ada (20GB) or A100
# Time: ~15-20 minutes
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[*]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }

# ── 1. System Dependencies ────────────────────────────────────────
info "Installing system packages..."
apt-get update -qq
apt-get install -y -qq ffmpeg sox libsox-dev git curl python3 python3-pip python3-venv nginx 2>/dev/null
ok "System packages"

# ── 2. NVIDIA Drivers + CUDA ──────────────────────────────────────
info "Checking NVIDIA drivers..."
if ! command -v nvidia-smi &>/dev/null; then
	info "Installing NVIDIA driver 550 + CUDA..."
	apt-get install -y -qq nvidia-driver-550 nvidia-cuda-toolkit 2>/dev/null || {
		info "Manual NVIDIA install..."
		ubuntu-drivers autoinstall
		apt-get install -y nvidia-cuda-toolkit
	}
	info "Reboot required — re-run this script after reboot"
	reboot
	exit 0
fi
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
ok "GPU detected"

# ── 3. Miniforge (conda) ──────────────────────────────────────────
info "Setting up conda..."
source "$HOME/miniforge3/etc/profile.d/conda.sh" 2>/dev/null || {
	curl -L -o /tmp/miniforge.sh https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh
	bash /tmp/miniforge.sh -b -p "$HOME/miniforge3"
	source "$HOME/miniforge3/etc/profile.d/conda.sh"
	conda init bash
}
conda create -n cosyvoice python=3.10 -y
source "$HOME/miniforge3/etc/profile.d/conda.sh"
conda activate cosyvoice
ok "Conda ready"

# ── 4. PyTorch CUDA ───────────────────────────────────────────────
info "Installing PyTorch with CUDA 12.1..."
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
python3 -c "import torch; print(f'PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
ok "PyTorch CUDA"

# ── 5. Clone CosyVoice 3 ──────────────────────────────────────────
REPO_DIR="/opt/CosyVoice"
MODEL_DIR="/opt/models/CosyVoice3"

info "Cloning CosyVoice 3..."
if [ ! -d "$REPO_DIR" ]; then
	git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git "$REPO_DIR"
fi

info "Installing Python dependencies..."
cd "$REPO_DIR"
pip install -e "$REPO_DIR/third_party/Matcha-TTS" 2>/dev/null || true
pip install \
	conformer diffusers hydra-core HyperPyYAML inflect librosa modelscope \
	omegaconf onnxruntime-gpu protobuf pyworld rich soundfile transformers \
	x-transformers uvicorn wetext wget gradio openai-whisper lightning \
	matplotlib tensorboard networkx gdown fastapi-cli grpcio grpcio-tools pyarrow \
	fastapi uvicorn pydantic httpx pyjwt edge-tts
ok "Dependencies"

# ── 6. Download Model ─────────────────────────────────────────────
info "Downloading CosyVoice 3 model (2-3 minutes)..."
mkdir -p "$MODEL_DIR"
python3 -c "
from modelscope import snapshot_download
snapshot_download('FunAudioLLM/Fun-CosyVoice3-0.5B-2512', local_dir='$MODEL_DIR')
import os
size = sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fs in os.walk('$MODEL_DIR') for f in fs)
print(f'Model: {size/1024/1024/1024:.1f} GB')
"
ok "Model ready"

# ── 7. Create API Service ─────────────────────────────────────────
info "Creating GPU API service..."

cat > /opt/cosyvoice_api.py <<'PYEOF'
import os, sys, warnings, json
warnings.filterwarnings('ignore')
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

sys.path.insert(0, '/opt/CosyVoice')
sys.path.insert(0, '/opt/CosyVoice/third_party/Matcha-TTS')

import torch, numpy as np, soundfile as sf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

MODEL_DIR = os.getenv('COSYVOICE_MODEL_DIR', '/opt/models/CosyVoice3')

class CloneRequest(BaseModel):
	text: str
	reference_audio_url: str = ""
	voice_id: str = ""

app = FastAPI(title="Lazynext CosyVoice 3 GPU")

cosyvoice = None

@app.on_event("startup")
def load_model():
	global cosyvoice
	from cosyvoice.cli.cosyvoice import CosyVoice3
	fp16 = os.getenv('COSYVOICE_FP16', '1') == '1'
	cosyvoice = CosyVoice3(MODEL_DIR, load_trt=False, load_vllm=False, fp16=fp16)
	print(f"CosyVoice 3 loaded (fp16={fp16}, CUDA={torch.cuda.is_available()})")

@app.get("/health")
def health():
	return {"status": "ok", "model_loaded": cosyvoice is not None}

@app.post("/clone")
def clone(req: CloneRequest):
	if cosyvoice is None:
		raise HTTPException(503, "Model not loaded")

	ref_audio = req.reference_audio_url.replace('file://', '') if req.reference_audio_url.startswith('file://') else '/opt/speaker_reference.wav'
	if not os.path.exists(ref_audio):
		raise HTTPException(400, f"Reference audio not found: {ref_audio}")

	import subprocess
	if not ref_audio.endswith('.wav'):
		wav = '/tmp/gpu_ref.wav'
		subprocess.run(['ffmpeg','-y','-i',ref_audio,'-ar','24000','-ac','1',wav], capture_output=True)
		ref_audio = wav

	prompt_text = f"You are a helpful assistant.<|endofprompt|>{req.voice_id}"
	all_speech = []
	for chunk in cosyvoice.inference_zero_shot(req.text, prompt_text, ref_audio):
		all_speech.append(chunk['tts_speech'])

	audio = np.concatenate(all_speech, axis=1).squeeze()
	out = f'/tmp/clone_{hash(req.text)}.wav'
	sf.write(out, audio, cosyvoice.sample_rate)
	return {"success": True, "audio_url": f"file://{out}", "bytes": os.path.getsize(out)}

if __name__ == '__main__':
	uvicorn.run(app, host='0.0.0.0', port=8092)
PYEOF

# Systemd service
cat > /etc/systemd/system/lazynext-cosyvoice-gpu.service <<EOF
[Unit]
Description=Lazynext CosyVoice 3 GPU Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt
Environment=COSYVOICE_MODEL_DIR=$MODEL_DIR
Environment=COSYVOICE_FP16=1
Environment=PYTHONUNBUFFERED=1
ExecStart=$HOME/miniforge3/envs/cosyvoice/bin/python /opt/cosyvoice_api.py
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now lazynext-cosyvoice-gpu
sleep 5
ok "GPU service running"

# ── 8. Print Setup Complete ───────────────────────────────────────
GPU_IP=$(curl -s ifconfig.me)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CosyVoice 3 GPU — Ready"
echo ""
echo "  Internal: http://127.0.0.1:8092"
echo "  Public:   http://$GPU_IP:8092"
echo ""
echo "  Add to main server's generative-studio env:"
echo "  COSYVOICE_GPU_URL=http://$GPU_IP:8092"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
