<div align="center">
  <h1>LAZYNEXT</h1>
  <p><strong>The Autonomous, Real-Time Collaborative NLE of the Future.</strong></p>
</div>

---

Lazynext is an enterprise-grade, multi-platform video editing ecosystem built on a strict high-performance architecture where Rust owns all business logic and the web/desktop/mobile shells are pure rendering layers.

## 🚀 Architecture

- **Core Logic (`rust/`)**: Single source of truth — CRDT state management, timeline engine, GPU compositor, AI agent orchestration, and export pipeline. All compiled to WebAssembly for the web shell and called natively on desktop.
- **Web Frontend (`apps/web/`)**: Next.js/React shell importing Rust via WASM. Premium Glassmorphism UI with real-time GPU compositing.
- **Native Desktop (`apps/desktop/`)**: GPUI (Zed) application calling Rust core directly with native wgpu rendering.
- **Mobile (`apps/mobile/`)**: React Native shell with UniFFI-generated native bindings to the Rust core.
- **Browser Extension (`apps/browser-extension/`)**: Capture video from any webpage directly into your Lazynext timeline.
- **Microservices (`services/`)**: 
  - `pre-processing` (Python FastAPI, :8000) — Whisper transcription, SAM2 rotoscoping, NeRF extraction
  - `generative-studio` (Python FastAPI, :8001) — Stable Video Diffusion, ElevenLabs dubbing, Demucs stem separation
  - `ai-agents` (Node.js, :8002) — Chronos Copilot LLM orchestration + CRDT WebSocket sync server
  - `render-service` (Node.js, :8003) — FFMPEG render farm with SSE progress streaming

## 🧠 Autonomous AI Agents

**Chronos**, the integrated LLM copilot, understands your timeline. Supports OpenAI, Anthropic, Gemini, and local Ollama models. Ask it to generate B-roll, dub in any language, remove silence, or color-grade your footage — it orchestrates the microservices and edits your timeline directly via CRDT operations.

## 🤝 Real-Time Collaboration

Operation-based CRDTs (CmRDT) with vector clocks and tombstones enable massive real-time multiplayer editing. WebSocket sync server with JWT auth, WebRTC voice chat signaling, and remote cursor presence. You and your colleagues can edit the same timeline simultaneously across the globe.

## 📱 The Distribution Network

Built-in `/feed` is a vertical-scrolling social discovery platform. Watch incredible edits and click "Remix" to clone their CRDT timeline state into your own editor.

---

## 🛠️ Quick Start (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext

# Boot the entire platform
docker compose up --build -d
```

**Services Started:**

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 Web App | `http://localhost:3000` | Full editor + API |
| 📡 Sync Server | `ws://localhost:8002` | CRDT WebSocket + WebRTC signaling |
| 🎬 Render Farm | `http://localhost:8003` | FFMPEG export with SSE progress |
| 🎨 Generative Studio | `http://localhost:8001` | AI video/audio generation |
| 🔧 Pre-Processing | `http://localhost:8000` | Whisper, SAM2, NeRF |
| 🗄️ PostgreSQL | `localhost:5434` | User data, projects, AI credits |

## 🧪 Development

```bash
# Rust (requires Rust toolchain + wasm-pack)
cd rust
cargo test --workspace
wasm-pack build --target web rust/wasm

# Web app (requires Bun)
bun install
bun run dev
bun run test
bun run test:e2e

# Python microservices
cd services/pre-processing && pip install -r requirements.txt && uvicorn main:app --reload
cd services/generative-studio && pip install -r requirements.txt && uvicorn main:app --reload
```

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LLM_PROVIDER` | No | `openai`, `anthropic`, `gemini`, or `ollama` (default) |
| `OPENAI_API_KEY` | No | For Whisper + GPT-4o features |
| `ANTHROPIC_API_KEY` | No | For Claude-powered Chronos |
| `REPLICATE_API_TOKEN` | No | For AI video generation |
| `ELEVENLABS_API_KEY` | No | For AI dubbing |
| `LAZYNEXT_WEBHOOK_URL` | No | Slack/Discord webhook for render notifications |

Services gracefully fall back to local processing when API keys are not configured — no mock data in production.

## 🏗️ Infrastructure

- **CI/CD**: GitHub Actions (Rust + web tests, Docker build/push + ACR deploy)
- **Deployment**: Azure Container Apps (all 5 services) + Azure PostgreSQL Flexible Server + Azure Container Registry + Azure Key Vault
- **Terraform**: Full Azure infrastructure as code with VNet, delegated subnets, Blob Storage backend
- **Kubernetes**: Optional AKS manifests for self-hosted deployments

## 📂 Project Structure

```
├── apps/
│   ├── web/                # Next.js editor + API
│   ├── desktop/            # GPUI native desktop app
│   ├── mobile/             # React Native mobile app
│   └── browser-extension/  # Chrome extension
├── rust/
│   ├── core/               # NLE state, autonomous editor
│   ├── crates/
│   │   ├── audio/          # DSP: EQ, compressor, VST host
│   │   ├── compositor/     # GPU compositor (18 blend modes)
│   │   ├── editor_core/    # Silence detection, scene detection
│   │   ├── effects/        # 6 GPU effect shaders
│   │   ├── export/         # FFMPEG encoding pipeline (MP4, ProRes, DCP, AAF)
│   │   ├── ffmpeg_filter/  # Type-safe FFMPEG filter graph builder
│   │   ├── gpu/            # wgpu context + scopes analyzer
│   │   ├── masks/          # JFA signed distance field masking
│   │   ├── neural_engine/  # Face detection, clip tagging, smart bins
│   │   ├── state/          # CRDT (LWW + operation-based), keyframes, vector clocks
│   │   ├── time/           # MediaTime, FrameRate, TimeCode
│   │   └── ...
│   ├── wasm/               # WASM bridge (all crates → JS)
│   ├── api-gateway/        # Axum REST gateway (:8005)
│   ├── cli/                # Headless CLI renderer
│   ├── mcp-server/         # MCP protocol server
│   └── p2p-sync/           # libp2p mesh networking
├── services/
│   ├── pre-processing/     # Python FastAPI (:8000)
│   ├── generative-studio/  # Python FastAPI (:8001)
│   ├── ai-agents/          # Node.js orchestrator + sync (:8002)
│   └── render-service/     # Node.js FFMPEG farm (:8003)
├── terraform/              # Azure Infrastructure as Code
├── k8s/                    # Kubernetes manifests
├── scripts/                # Build, deploy, and test utilities
└── docs/                   # Architecture and design docs
```

---

<div align="center">
  <p><i>Built with ⚡️ by Lazynext</i></p>
</div>
