#!/usr/bin/env bash
# deploy.sh — Full Linode Lazynext deployment
# ───────────────────────────────────────────────────────────────
# USAGE:
#   # First time:
#   ./deploy.sh bootstrap
#
#   # Every deploy:
#   ./deploy.sh [--skip-build]
#
#   # Individual service restart:
#   ./deploy.sh restart web|api|collab|ai|render|analytics|social|preprocess|genstudio
# ───────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LINODE_HOST="${LINODE_HOST:-192.46.209.127}"
SSH_USER="${SSH_USER:-root}"
REMOTE_BASE="${REMOTE_BASE:-/opt/lazynext}"

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Check pre-reqs ──
check_prereqs() {
	command -v ssh >/dev/null 2>&1 || err "ssh is required"
	command -v scp >/dev/null 2>&1 || err "scp is required"
	command -v rsync >/dev/null 2>&1 || err "rsync is required"
	info "All pre-requisites satisfied"
}

# ── Bootstrap (first time setup) ──
bootstrap() {
	info "Bootstrapping Linode server at $LINODE_HOST..."
	check_prereqs

	ssh "$SSH_USER@$LINODE_HOST" bash -s <<'BOOTSTRAP_EOF'
set -euo pipefail

echo "[BOOTSTRAP] Updating system..."
apt-get update && apt-get upgrade -y

echo "[BOOTSTRAP] Installing system dependencies..."
apt-get install -y --no-install-recommends \
    build-essential pkg-config libssl-dev \
    python3 python3-pip python3-venv \
    unzip ffmpeg curl wget gnupg ca-certificates \
    ufw fail2ban nginx

echo "[BOOTSTRAP] Installing Bun..."
if ! command -v bun &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

echo "[BOOTSTRAP] Installing Rust..."
if ! command -v cargo &>/dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo "[BOOTSTRAP] Creating directory structure..."
mkdir -p /opt/lazynext
mkdir -p /opt/caddy
mkdir -p /var/log/lazynext
mkdir -p /opt/lazynext/media
mkdir -p /opt/lazynext/renders

echo "[BOOTSTRAP] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[BOOTSTRAP] Setting up Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

echo "[BOOTSTRAP] Bootstrap complete!"
BOOTSTRAP_EOF

	ok "Bootstrap complete. Next: ./deploy.sh"
}

# ── Build all artifacts locally ──
build_locally() {
	info "Building all artifacts locally..."

	info "Building Rust services..."
	cargo build --release -p lazynext_api_gateway -p collab-server -p lazynext_cli

	info "Building WASM..."
	./build-wasm.sh

	info "Building Next.js web app..."
	(cd apps/web && bun run build)

	info "Installing service dependencies..."
	for svc in services/ai-agents services/render-service services/analytics-service services/social-publish; do
		(cd "$svc" && bun install --production)
	done

	info "Setting up Python virtual environments..."
	for svc in services/pre-processing services/generative-studio; do
		if [ -f "$svc/requirements.txt" ]; then
			(cd "$svc" && python3 -m venv venv && venv/bin/pip install -r requirements.txt)
		fi
	done

	ok "All artifacts built"
}

# ── Deploy to Linode ──
deploy() {
	local skip_build="${1:-false}"

	info "Deploying to $LINODE_HOST..."

	if [ "$skip_build" != "true" ]; then
		build_locally
	fi

	info "Syncing project files to $REMOTE_BASE..."
	rsync -avz --delete \
		--exclude='node_modules' \
		--exclude='target' \
		--exclude='.git' \
		--exclude='*.dmg' \
		--exclude='venv' \
		--exclude='__pycache__' \
		--exclude='.pytest_cache' \
		"$PROJECT_ROOT/" "$SSH_USER@$LINODE_HOST:$REMOTE_BASE/"

	info "Copying systemd service files..."
	scp "$SCRIPT_DIR/systemd/"*.service "$SSH_USER@$LINODE_HOST:/etc/systemd/system/"

	info "Configuring environment variables..."
	ssh "$SSH_USER@$LINODE_HOST" "mkdir -p /opt/lazynext/infra/linode && if [ ! -f /opt/lazynext/infra/linode/.env.linode ]; then echo \"BETTER_AUTH_SECRET=\$(openssl rand -hex 32)\" > /opt/lazynext/infra/linode/.env.linode; fi"

	info "Copying infrastructure files..."
	scp "$SCRIPT_DIR/docker-compose.yml" "$SSH_USER@$LINODE_HOST:/opt/lazynext/infra/linode/docker-compose.yml"
	scp "$SCRIPT_DIR/Caddyfile" "$SSH_USER@$LINODE_HOST:/opt/caddy/Caddyfile"

	info "Restarting services on remote..."
	ssh "$SSH_USER@$LINODE_HOST" bash -s <<REMOTE_EOF
set -euo pipefail

# Reload systemd
systemctl daemon-reload

# Start infra (Postgres, Redis, Caddy)
cd /opt/lazynext/infra/linode
docker compose up -d

# Restart all Lazynext services
for svc in lazynext-web lazynext-api-gateway lazynext-collab \
           lazynext-ai-agents lazynext-render lazynext-analytics \
           lazynext-social lazynext-preprocess lazynext-genstudio; do
    if systemctl is-enabled "\$svc" &>/dev/null; then
        systemctl restart "\$svc" || systemctl start "\$svc"
        echo "  [OK] \$svc"
    else
        systemctl enable --now "\$svc" || echo "  [SKIP] \$svc (not configured)"
    fi
done

# Restart Caddy
docker compose -f /opt/lazynext/infra/linode/docker-compose.yml restart caddy

echo "Deployment complete!"
REMOTE_EOF

	ok "Deployment complete!"
}

# ── Restart individual service ──
restart_service() {
	local svc="$1"
	info "Restarting $svc..."
	ssh "$SSH_USER@$LINODE_HOST" "systemctl restart lazynext-$svc"
	ok "Restarted lazynext-$svc"
}

# ── Main ──
case "${1:-}" in
	bootstrap)
		bootstrap
		;;
	--skip-build)
		deploy "true"
		;;
	restart)
		case "${2:-}" in
			web|api|collab|ai|render|analytics|social|preprocess|genstudio)
				restart_service "$2"
				;;
			*)
				err "Usage: $0 restart <web|api|collab|ai|render|analytics|social|preprocess|genstudio>"
				;;
		esac
		;;
	build)
		build_locally
		;;
	*)
		deploy "false"
		;;
esac
