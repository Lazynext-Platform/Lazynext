# Infrastructure

Lazynext infrastructure is deployed on **Linode** using Docker Compose and systemd service units.

## Directory Layout

```
infra/
├── linode/         # Linode deployment (primary deployment target)
│   ├── deploy.sh           # Full deploy script (bootstrap, build, deploy, restart)
│   ├── docker-compose.yml  # PostgreSQL, Redis, Caddy reverse proxy
│   ├── Caddyfile           # Caddy v2 config with automatic Let's Encrypt
│   └── systemd/            # 10 systemd service unit files for all 9 app services + infra
└── k8s/            # Kubernetes manifests for infra-level K8s resources (currently empty)
```

## Linode (`infra/linode/`)

Production deployment at 192.46.209.127 (Linode g6-standard-4, Mumbai, 4 vCPU/8GB RAM).

### Services (all via systemd)

| Service | Port | Description |
|---|---|---|
| `lazynext-web` | 3000 | Next.js web application |
| `lazynext-api-gateway` | 8005 | Axum REST gateway (Rust) |
| `lazynext-collab` | 8004 | CRDT sync + WebRTC signaling (Rust) |
| `lazynext-ai-agents` | 8002 | AI Copilot + WebSocket sync |
| `lazynext-render` | 8003 | FFmpeg render farm |
| `lazynext-preprocess` | 8000 | Whisper, SAM2, NeRF (Python) |
| `lazynext-genstudio` | 8001 | Diffusion models, dubbing, upscaling (Python) |
| `lazynext-analytics` | 8006 | Analytics pipeline |
| `lazynext-social` | 8007 | YouTube, TikTok, Instagram, Twitter/X publishing |

### Usage

```bash
cd infra/linode
cp .env.linode.example .env.linode  # fill in values
./deploy.sh bootstrap               # first-time setup
./deploy.sh                         # full deploy
./deploy.sh restart web             # restart individual service
./deploy.sh --skip-build            # deploy without rebuilding
```

### Key Design Decisions

- **Primary deployment**: Linode Docker Compose + systemd (self-managed, cost-effective)
- **Reverse proxy**: Caddy v2 with automatic Let's Encrypt SSL
- **Database**: PostgreSQL 17 (Docker container on same host)
- **Cache**: Redis 7 (Docker container on same host)
- **Media storage**: Local filesystem at `/opt/lazynext/media`
- **Monitoring**: Self-hosted Prometheus, Grafana, Loki, Tempo (optional)

## Kubernetes (`infra/k8s/`)

Reserved for infrastructure-level Kubernetes resources — currently empty. Workload manifests at `/k8s/` in repo root for future K8s migration.
