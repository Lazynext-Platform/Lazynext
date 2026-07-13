#!/usr/bin/env bash
# Lazynext Hetzner CX32 — Provision + Deploy
# ──────────────────────────────────────────────────────────────────
# Prerequisites:
#   1. Sign up at https://console.hetzner.com/
#   2. Create API token at https://console.hetzner.com/projects/<id>/security/tokens
#   3. export HCLOUD_TOKEN="your-token"
#   4. ./scripts/deploy-hetzner.sh
#
# Cost: ~€10.59/mo (~$11.60/mo) for CX32 (8GB RAM, 4 vCPU, 80GB SSD)
# Region: Singapore (closest to Mumbai, low latency to India)
set -euo pipefail

HCLOUD_TOKEN="${HCLOUD_TOKEN:-}"
SERVER_NAME="${SERVER_NAME:-lazynext-prod}"
SERVER_TYPE="${SERVER_TYPE:-cx32}"
SERVER_IMAGE="${SERVER_IMAGE:-ubuntu-24.04}"
SERVER_LOCATION="${SERVER_LOCATION:-sgp1}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${CYAN}[*]${NC} $*"; }
ok()    { echo -e "${GREEN}[✓]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*"; exit 1; }

if [ -z "$HCLOUD_TOKEN" ]; then
	err "HCLOUD_TOKEN not set. Get one at https://console.hetzner.com/"
fi

# ── 1. Create SSH key if needed ────────────────────────────────────
info "Checking SSH key..."
SSH_KEY=$(cat ~/.ssh/id_rsa.pub 2>/dev/null || cat ~/.ssh/id_ed25519.pub 2>/dev/null)
if [ -z "$SSH_KEY" ]; then
	info "Generating SSH key..."
	ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -q
	SSH_KEY=$(cat ~/.ssh/id_ed25519.pub)
fi
SSH_KEY_NAME="lazynext-key-$(date +%s)"

# ── 2. Upload SSH key ──────────────────────────────────────────────
info "Uploading SSH key..."
curl -s -X POST https://api.hetzner.cloud/v1/ssh_keys \
	-H "Authorization: Bearer $HCLOUD_TOKEN" \
	-H "Content-Type: application/json" \
	-d "{\"name\":\"$SSH_KEY_NAME\",\"public_key\":\"$SSH_KEY\"}" > /dev/null
ok "SSH key uploaded"

# ── 3. Create server ───────────────────────────────────────────────
info "Creating $SERVER_TYPE server in $SERVER_LOCATION..."
CREATE_RESP=$(curl -s -X POST https://api.hetzner.cloud/v1/servers \
	-H "Authorization: Bearer $HCLOUD_TOKEN" \
	-H "Content-Type: application/json" \
	-d "{
		\"name\":\"$SERVER_NAME\",
		\"server_type\":\"$SERVER_TYPE\",
		\"image\":\"$SERVER_IMAGE\",
		\"location\":\"$SERVER_LOCATION\",
		\"ssh_keys\":[\"$SSH_KEY_NAME\"],
		\"start_after_create\":true
	}")

SERVER_ID=$(echo "$CREATE_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['server']['id'])" 2>/dev/null)

if [ -z "$SERVER_ID" ]; then
	echo "$CREATE_RESP"
	err "Failed to create server"
fi

ok "Server #$SERVER_ID created"

# ── 4. Wait for IP ─────────────────────────────────────────────────
info "Waiting for IP..."
for i in $(seq 1 30); do
	SERVER_IP=$(curl -s https://api.hetzner.cloud/v1/servers/$SERVER_ID \
		-H "Authorization: Bearer $HCLOUD_TOKEN" \
		| python3 -c "import json,sys; print(json.load(sys.stdin)['server']['public_net']['ipv4']['ip'])" 2>/dev/null)
	if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "None" ]; then
		break
	fi
	sleep 2
done

if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "None" ]; then
	err "Timed out waiting for IP"
fi

ok "IP: $SERVER_IP"

# ── 5. Wait for SSH ────────────────────────────────────────────────
info "Waiting for SSH..."
for i in $(seq 1 30); do
	if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 root@$SERVER_IP "echo ok" 2>/dev/null; then
		break
	fi
	sleep 3
done

ok "SSH ready"

# ── 6. Bootstrap server ────────────────────────────────────────────
info "Bootstrapping server..."
ssh root@$SERVER_IP bash -s <<'BOOTSTRAP'
set -euo pipefail
apt-get update -qq && apt-get install -y -qq \
	ffmpeg sox libsox-dev git curl python3 python3-pip python3-venv \
	docker.io nginx certbot python3-certbot-nginx ufw fail2ban 2>/dev/null

# Docker
systemctl enable --now docker

# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# Bun
curl -fsSL https://bun.sh/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Directories
mkdir -p /opt/lazynext /opt/caddy /var/log/lazynext /opt/lazynext/media
echo "Bootstrap done"
BOOTSTRAP

ok "Server bootstrapped"

# ── 7. Sync project ────────────────────────────────────────────────
info "Syncing project..."
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rsync -avz --delete \
	--exclude='node_modules' --exclude='target' --exclude='.git' \
	--exclude='*.dmg' --exclude='__pycache__' --exclude='.pytest_cache' \
	"$PROJECT_ROOT/" "root@$SERVER_IP:/opt/lazynext/"

ok "Code synced"

# ── 8. Setup services ──────────────────────────────────────────────
info "Setting up services..."
ssh root@$SERVER_IP bash -s <<SETUP
set -euo pipefail

# Generative Studio venv
cd /opt/lazynext/services/generative-studio
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn pydantic httpx pyjwt edge-tts f5-tts librosa soundfile numpy diffusers opencv-python-headless demucs gradio_client
deactivate

# Copy systemd services
cp /opt/lazynext/infra/linode/systemd/*.service /etc/systemd/system/ 2>/dev/null || true

# Create env file
cat > /opt/lazynext/infra/linode/.env.linode.production <<ENVEOF
ENVIRONMENT=production
DOMAIN=lazynext.com
SERVER_IP=$SERVER_IP
DB_USER=lazynext
DB_PASSWORD=CHANGE_ME
DB_NAME=lazynext
DATABASE_URL=postgresql://lazynext:CHANGE_ME@127.0.0.1:5432/lazynext
BETTER_AUTH_SECRET=CHANGE_ME_64_CHARS
BETTER_AUTH_URL=https://lazynext.com
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=CHANGE_ME
GEMINI_API_KEY=CHANGE_ME
BREVO_API_KEY=CHANGE_ME
STORAGE_PROVIDER=local
ENVEOF

echo "Service setup done"
SETUP

ok "Services configured"

# ── Done ───────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Hetzner CX32 — Ready"
echo "  IP: $SERVER_IP"
echo "  SSH: ssh root@$SERVER_IP"
echo ""
echo "  Next steps:"
echo "  1. Update env: ssh root@$SERVER_IP"
echo "  2. Start services: systemctl start lazynext-*"
echo "  3. Point DNS to $SERVER_IP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
