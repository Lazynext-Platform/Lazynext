<div align="center">
  <h1>LAZYNEXT</h1>
  <p><strong>The Autonomous, Real-Time Collaborative NLE. AI-native video editing across every surface.</strong></p>

  <p>
    <a href="https://github.com/Lazynext-Platform/Lazynext/actions"><img src="https://img.shields.io/github/actions/workflow/status/Lazynext-Platform/Lazynext/ci.yml?branch=main&label=CI" alt="CI"></a>
    <a href="https://github.com/Lazynext-Platform/Lazynext/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
    <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="Contributions"></a>
  </p>
</div>

---

Lazynext is an enterprise-grade, multi-platform video editing ecosystem where **Rust owns all business logic** and every app is a dumb rendering shell. The core engine — CRDT state management, timeline engine, GPU compositor, AI agent orchestration, and FFMPEG export pipeline — is compiled to WebAssembly for the browser and called natively on desktop.

---

## Architecture

```
                          ┌──────────────────────────┐
                          │       Apps (UI-only)      │
                          │  Web / Desktop / Mobile   │
                          │  Extension / CLI / API    │
                          └────────────┬─────────────┘
                                       │ WASM / UniFFI / HTTP
                          ┌────────────▼─────────────┐
                          │      Rust Core (NLE)      │
                          │  CRDTs · Timeline · GPU   │
                          │  Effects · Audio · Export │
                          └───────┬──────────┬────────┘
                                  │          │
                    ┌─────────────▼─┐    ┌───▼──────────────┐
                    │  AI Services   │    │  Render Farm      │
                    │  pre-processing│    │  render-service   │
                    │  generative-   │    │  (FFMPEG + SSE)   │
                    │  studio        │    │  :8003            │
                    │  :8000 :8001   │    │                   │
                    │  ai-agents     │    │                   │
                    │  :8002         │    │                   │
                    └───────────────┘    └───────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │    PostgreSQL      │
                        │  Drizzle ORM       │
                        └───────────────────┘
```

**Core principle**: All editing logic, state mutations, and rendering decisions live in `rust/`. The apps under `apps/` are pure presentation shells — they import Rust (via WASM on web, natively on desktop) and never duplicate business logic.

| Layer | Technology | Role |
|-------|-----------|------|
| **Core Engine** | Rust (workspace of 20+ crates) | NLE state machine, GPU compositor, export encoder, neural engine |
| **State Layer** | CRDTs (LWW-Register + CmRDT) | Real-time conflict-free collaboration with vector clocks |
| **Web Shell** | Next.js 16 + React 19 + TailwindCSS | Glassmorphism editor UI, canvas preview, timeline |
| **Desktop Shell** | GPUI (Zed framework) + wgpu | Native rendering, Blackmagic DeckLink I/O |
| **Mobile Shell** | React Native + UniFFI | Native bindings to Rust core |
| **AI Services** | Python FastAPI + Node.js (Bun) | Whisper, SAM2, Stable Video Diffusion, LLM orchestration |
| **Export Pipeline** | FFMPEG (type-safe filter graph) | MP4, ProRes, DCP, AAF, MOV with SSE progress streaming |

---

## Platform Matrix

Lazynext targets **7 delivery surfaces**, each at a different stage of completion:

| # | Format | Layer | Runtime | Completion | Status |
|---|--------|-------|---------|------------|--------|
| 1 | **Web App** | `apps/web` | Next.js + WASM | ██████████ 98% | Beta |
| 2 | **Desktop App** | `apps/desktop` | GPUI + native Rust | █████████░ 95% | Beta |
| 3 | **Mobile App** | `apps/mobile` | React Native + UniFFI | █████████░ 95% | Beta |
| 4 | **Browser Extension** | `apps/browser-extension` | Chrome MV3 | ██████████ 98% | Beta |
| 5 | **CLI Renderer** | `rust/cli` | Pure Rust binary | █████████░ 95% | Beta |
| 6 | **REST API Gateway** | `rust/api-gateway` | Axum :8005 | █████████░ 95% | Beta |
| 7 | **MCP Server** | `rust/mcp-server` | MCP protocol | █████████░ 95% | Beta |

**Export format support**:

| Format | Container | Codec | Status |
|--------|-----------|-------|--------|
| H.264 | MP4 | h264 | Stable |
| H.265/HEVC | MP4 | hevc | Stable |
| ProRes 422 HQ | MOV | prores_ks | Stable |
| DCP (SMPTE) | XML+MXF | jpeg2000 | Beta |
| AAF | AAF | — | Beta |
| GIF | GIF | gif | Stable |

---

## Quick Start

### Prerequisites

- **Rust** (stable, 1.96+) with `wasm-pack`
- **Bun** (1.3.14+)
- **Docker** (for full-platform deployment)
- **PostgreSQL** 16 (or use the Docker compose stack)

### Docker Compose (Full Platform)

```bash
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext

# Start all 8 services — web, AI agents, render, collab, analytics, pre-processing, generative studio, PostgreSQL
docker compose up --build -d
```

| Service | URL | Purpose |
|---------|-----|---------|
| Web App | `http://localhost:3000` | Editor + API |
| AI Agents | `http://localhost:8002` | Chronos Copilot LLM + WebSocket CRDT sync |
| Render Farm | `http://localhost:8003` | FFMPEG export with SSE progress |
| Collab Server | `http://localhost:8004` | Native Rust CRDT sync + WebRTC signaling |
| Generative Studio | `http://localhost:8001` | AI video/audio generation |
| Pre-Processing | `http://localhost:8000` | Whisper, SAM2, NeRF |
| Analytics Service | `http://localhost:8006` | Data ingestion + LTV engine |
| PostgreSQL | `localhost:5434` | User data, projects, AI credits |

### Local Development Setup

```bash
# 1. Install dependencies
bun install

# 2. Build WASM (required before running web)
./build-wasm.sh

# 3. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, and optional API keys

# 4. Run database migrations
bun run db:generate
bun run db:migrate

# 5. Start web dev server
bun run dev                    # → http://localhost:3000
```

### Bootstrap Everything

```bash
./start-platform.sh            # Kills stale processes, starts all 8 services
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Core Language** | Rust (workspace, 20+ crates) |
| **Web Framework** | Next.js 16 (App Router) + React 19 |
| **Styling** | TailwindCSS with Glassmorphism design system |
| **Desktop Framework** | GPUI (Zed) + wgpu |
| **Mobile** | React Native + UniFFI |
| **State Management** | CRDTs (LWW-Register + operation-based) |
| **Database** | PostgreSQL via Drizzle ORM |
| **Auth** | better-auth with Upstash Redis rate limiting |
| **AI Inference** | OpenAI, Anthropic, Gemini, Ollama (pluggable) |
| **Transcription** | OpenAI Whisper (local + API) |
| **Image/Video Gen** | Stable Video Diffusion, SAM2, NeRF |
| **Audio DSP** | Custom Rust DSP crate (EQ, compressor, VST host) |
| **Export** | FFMPEG with type-safe filter graph builder |
| **GPU** | wgpu (cross-platform) |
| **CI/CD** | GitHub Actions → Azure Container Apps |
| **Infrastructure** | Terraform (Azure), optional Kubernetes |
| **Payments** | Stripe |
| **Email** | Resend |

---

## Key Features

### AI-Native Editing (Chronos Copilot)

The integrated LLM orchestrator understands your timeline. It accepts natural language commands and mutates timeline state directly via CRDT operations:

- **Transcript-driven editing** — Delete filler words by editing text; the timeline follows.
- **Auto B-roll** — "Find B-roll for this segment" pulls from stock or generates via AI.
- **One-click dubbing** — Translate and voice-clone into any language (ElevenLabs integration).
- **Silence removal** — Detect and strip dead air automatically.
- **Smart reframe** — AI subject tracking auto-crops 16:9 to 9:16 for social.
- **Color match** — Match the palette of one clip to a reference frame or image.

Chronos supports OpenAI, Anthropic, Gemini, and local Ollama models. All features gracefully degrade to local processing when API keys are absent — no mock data.

### Real-Time Collaboration

Operation-based CRDTs (CmRDT) with vector clocks and tombstones enable massive multiplayer editing:

- **Conflict-free merging** — Edit the same timeline simultaneously; CRDTs guarantee convergence.
- **WebSocket sync** — JWT-authenticated persistent connection with `ai-agents` (:8002).
- **Remote presence** — See colleagues' cursors and selections in real time.
- **WebRTC voice chat** — Built-in signaling for team communication.
- **Timeline branching** — `rust/temporal-versioning` provides Git-like branching and merging for timelines.

### GPU Compositor

The Rust compositor (`rust/crates/compositor`) is a full GPU-accelerated rendering engine:

- **17 blend modes** — Screen, multiply, overlay, hard-light, and 13 more.
- **11 GPU effect shaders** — Custom wgpu shaders for real-time effects.
- **JFA signed distance field masking** — Fast, resolution-independent masks (`rust/crates/masks`).
- **DeckLink I/O** — Blackmagic hardware output for broadcast monitoring (`rust/crates/decklink`).

### Audio Engine

A complete DSP pipeline in Rust (`rust/crates/audio`):

- **10-band parametric EQ** with configurable Q and filter types.
- **Compressor** with threshold, ratio, attack, release, and knee.
- **VST host** — Load and chain third-party VST3 plugins.
- **Stem separation** — Demucs integration splits dialogue, music, and effects.
- **Auto-ducking** — Sidechain compression against dialogue tracks.

### Export Pipeline

Type-safe FFMPEG encoding with SSE progress streaming:

- **Format matrix**: MP4 (H.264/H.265), ProRes 422 HQ, DCP (SMPTE-compliant), AAF, MOV, GIF.
- **Type-safe filter graph** (`rust/crates/ffmpeg_filter`) — Build complex filter chains without stringly-typed errors.
- **SSE progress** — Real-time export progress streamed from `render-service` (:8003).
- **Headless CLI** — `rust/cli` for scripted / CI rendering.

### Plugin System

Third-party plugin SDK at `rust/plugin-api`:

- **VST3 audio plugins** — Full VST3 host with parameter automation.
- **Effect shaders** — Custom GPU shader plugins.
- **Export presets** — Pluggable export format definitions.

### Provenance & Content Authenticity

The `rust/provenance` crate implements the C2PA specification for content credentials:

- **Cryptographic provenance** — Every edit is signed and traceable.
- **Tamper-evident timeline** — Detect unauthorized modifications.
- **Export with credentials** — Embed provenance metadata in rendered output.

---

## Development Commands

### Rust

```bash
# Test entire workspace
cargo test --workspace

# Build WASM (required before web dev)
./build-wasm.sh
# or: wasm-pack build --target web rust/wasm

# Lint
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

### Web App (`apps/web`)

```bash
bun run dev          # Next.js dev server (:3000)
bun run test         # Unit tests (Bun)
bun run test:e2e     # Playwright E2E
bun run typecheck    # tsc --noEmit
bun run lint         # ESLint
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run pending migrations
```

### Python Microservices

```bash
cd services/pre-processing && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
cd services/generative-studio && pip install -r requirements.txt && uvicorn main:app --reload --port 8001
```

### Node Microservices

```bash
cd services/ai-agents && bun run start       # :8002
cd services/render-service && bun run start   # :8003
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (64 chars) |
| `STORAGE_PROVIDER` | No | `local` (default) or `azure` |
| `LLM_PROVIDER` | No | `openai`, `anthropic`, `gemini`, or `ollama` |
| `OPENAI_API_KEY` | No | Whisper + GPT-4o features |
| `ANTHROPIC_API_KEY` | No | Claude-powered Chronos |
| `REPLICATE_API_TOKEN` | No | AI video generation |
| `ELEVENLABS_API_KEY` | No | AI dubbing |
| `NEXT_PUBLIC_*_URL` | No | Microservice URLs (defaults to localhost) |
| `UPSTASH_REDIS_URL` | No | Rate limiting (required in production) |
| `STRIPE_SECRET_KEY` | No | Payments |

---

## Project Structure

```
lazynext/
├── apps/
│   ├── web/                    # Next.js 16 editor + API (App Router)
│   ├── desktop/                # GPUI native desktop application
│   ├── mobile/                 # React Native + UniFFI bindings
│   └── browser-extension/      # Chrome MV3 capture extension
├── rust/
│   ├── core/                   # NLE engine: state, timeline, autonomous editor
│   ├── crates/
│   │   ├── audio/              # DSP: EQ, compressor, VST host
│   │   ├── bridge/             # Inter-crate communication
│   │   ├── compositor/         # GPU compositor (17 blend modes)
│   │   ├── decklink/           # Blackmagic DeckLink I/O
│   │   ├── editor_core/        # Silence detection, scene detection
│   │   ├── effects/            # 11 GPU effect shaders
│   │   ├── export/             # FFMPEG encoding (MP4, ProRes, DCP, AAF)
│   │   ├── ffmpeg_filter/      # Type-safe filter graph builder
│   │   ├── gpu/                # wgpu context + scopes analyzer
│   │   ├── masks/              # JFA signed distance field masking
│   │   ├── neural_engine/      # Face detection, clip tagging, smart bins
│   │   ├── plugin/             # Plugin host runtime
│   │   ├── state/              # CRDTs, keyframes, vector clocks, tombstones
│   │   └── time/               # MediaTime, FrameRate, TimeCode
│   ├── wasm/                   # WASM bridge (all crates → JS)
│   ├── api-gateway/            # Axum REST gateway (:8005)
│   ├── cli/                    # Headless CLI renderer
│   ├── mcp-server/             # MCP protocol server for AI agents
│   ├── p2p-sync/               # libp2p mesh networking
│   ├── plugin-api/             # Third-party plugin SDK
│   ├── provenance/             # Content authenticity (C2PA)
│   └── temporal-versioning/    # Timeline versioning + branching
├── services/
│   ├── pre-processing/         # Python FastAPI (:8000)
│   ├── generative-studio/      # Python FastAPI (:8001)
│   ├── ai-agents/              # Node.js Chronos + CRDT sync (:8002)
│   ├── render-service/         # Node.js FFMPEG farm (:8003)
│   ├── collab-server/          # Rust CRDT sync + WebRTC signaling (:8004)
│   └── analytics-service/      # Node.js data ingestion + LTV (:8006)
├── infra/terraform/            # Infrastructure as code
├── k8s/                        # Kubernetes manifests (optional AKS)
├── .github/workflows/          # CI/CD (ci.yml, production.yml)
└── docs/                       # Architecture, ADRs, runbooks, API reference
```

---

## Documentation

### Project & process (current)

| Document | Description |
|----------|-------------|
| [Project Context](docs/project-context.md) | What Lazynext is — identity, tech stack, scope, constraints |
| [Project Roadmap](docs/project-roadmap.md) | Feature priorities, progress, and remaining work |
| [Project Changelog](docs/project-changelog.md) | Shipped features log |
| [Project Motto](docs/project-motto.md) | DO/DON'T guardrails for contributors and AI agents |
| [Mastery Framework](docs/mastery.md) | The full development-process framework (rules + templates) |
| [Platform Assessment](PLATFORM_ASSESSMENT.md) | Current per-format completion % and gap analysis |
| [Contributing](CONTRIBUTING.md) | Development workflow, code style, PR process |
| [AGENTS.md](AGENTS.md) | AI agent orientation |
| [AGENTS.md](AGENTS.md) | Developer / agent quick-reference |

### Per-feature docs

Each shipped feature has a folder under [`docs/features/`](docs/features/) (e.g. `09-production-hardening-web/`) containing its discussion, architecture, tasks, testplan, changelog, and review.

### Pre-Mastery reference archive

The earlier technical docs (architecture, API reference, security model, OpenAPI spec, performance, effects renderer, keyframes, plugin guide, onboarding, ADRs, runbooks) are preserved under [`docs/_archive/`](docs/_archive/) for historical reference and are superseded by the current docs above.

---

## Infrastructure

- **CI/CD**: GitHub Actions — Rust test/lint, web test/typecheck/lint, Docker build/push, Azure Container Apps deploy.
- **Deployment**: Azure Container Apps (8 services) + Azure PostgreSQL Flexible Server with private VNet. Optional AKS for GPU workloads.
- **Infrastructure as Code**: Terraform in `infra/terraform/` — VNet, delegated subnets, Blob Storage backend, Key Vault.
- **Database**: PostgreSQL 16 via Drizzle ORM. Migrations in `apps/web/src/drizzle/`. Schema in `apps/web/src/db/schema.ts`.

---

<div align="center">
  <p><i>Built by Lazynext</i></p>
</div>
