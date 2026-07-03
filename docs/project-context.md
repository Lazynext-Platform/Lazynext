# 🎯 Project Context

> **Project**: Lazynext
> **Version**: 1.0.0 (Production)
> **Last Updated**: 2026-07-01

---

## What Is This Project?

Lazynext is an enterprise-grade, multi-platform AI-native Non-Linear Video Editor (NLE). Rust owns all business logic — CRDT state management, GPU compositing, audio DSP, FFMPEG export encoding, and AI agent orchestration. Each app under `apps/` is a dumb rendering shell that imports Rust (via WASM on web, natively on desktop, via UniFFI on mobile). The Lazynext AI Agent Copilot translates natural language editing commands into CRDT operations on the timeline.

## Project Type

| Property | Value |
|---|---|
| **Type** | Web App / Desktop App / Mobile App / CLI Tool / API Service / Browser Extension |
| **Platform** | Web, macOS, Windows, Linux, iOS, Android |
| **Distribution** | SaaS (web), Binary (desktop/CLI), App Store (mobile), Chrome Web Store (extension) |

## Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Language** | Rust | 1.96+ stable | Memory safety, WASM compilation, CRDT implementation, zero-cost abstractions |
| **Web Framework** | Next.js | 16 (App Router) | React 19 ecosystem, server components, ISR |
| **Web UI** | React | 19 | Component model, hooks, ecosystem |
| **Styling** | TailwindCSS | v4 | Glassmorphism design system, utility-first |
| **Desktop Framework** | GPUI (Zed) | Latest | Native Rust GUI, wgpu rendering, no JS bridge |
| **Mobile** | React Native | Latest | Code sharing with web, UniFFI for Rust bindings |
| **GPU** | wgpu | Latest | Cross-platform (WebGPU, Vulkan, Metal, DX12) |
| **State** | CRDTs | Custom (LWW-Register + CmRDT) | Real-time conflict-free collaboration |
| **Database** | PostgreSQL | 16 | Drizzle ORM, Azure Flexible Server |
| **ORM** | Drizzle | Latest | Type-safe SQL, migrations |
| **Auth** | better-auth | Latest | JWT (HS256), Upstash Redis rate limiting |
| **Testing (Rust)** | cargo test | — | Workspace-wide unit + integration tests |
| **Testing (Web)** | Bun test + Playwright | — | Unit + E2E |
| **Testing (Python)** | pytest | — | Microservice tests |
| **Package Manager** | Bun | 1.3.14+ | Workspaces, speed, TypeScript native |
| **Build** | Turbo + cargo + wasm-pack | — | Monorepo orchestration |
| **CI/CD** | GitHub Actions | — | Lint, test, build, deploy |
| **Deployment** | Azure Container Apps | — | Docker containers, Terraform IaC |
| **Infrastructure** | Terraform + K8s + Ansible | — | Azure, optional AKS |
| **Payments** | Stripe | — | Subscription management |
| **Email** | Resend | — | Transactional email |
| **Monitoring** | Prometheus + Grafana + Loki + Tempo | — | Metrics, logs, traces |

## Architecture Overview

### Pattern

**Monorepo with strict layer separation**: Rust owns all business logic. Each app under `apps/` is a pure UI shell. Backend microservices in `services/` handle async offload tasks (AI inference, rendering, analytics). Infrastructure is managed as code (Terraform, K8s, Ansible).

### Project Structure

```
lazynext/
├── apps/                    # UI Shells only — no business logic
│   ├── web/                 # Next.js 16 + React 19 + TailwindCSS
│   ├── desktop/             # GPUI native (Zed framework)
│   ├── mobile/              # React Native + UniFFI
│   └── browser-extension/   # Chrome MV3
├── rust/                    # Single source of truth — ALL business logic
│   ├── core/                # NLE engine (state, timeline, autonomous editor)
│   ├── crates/              # Domain crates (15 crates)
│   │   ├── audio/           # DSP: EQ, compressor, VST host
│   │   ├── bridge/          # Inter-crate communication
│   │   ├── compositor/      # GPU compositor (17 blend modes)
│   │   ├── decklink/        # Blackmagic DeckLink I/O
│   │   ├── editor_core/     # Silence/scene detection
│   │   ├── effects/         # 11 GPU effect shaders
│   │   ├── export/          # FFMPEG encoding
│   │   ├── ffmpeg_filter/   # Type-safe filter graph
│   │   ├── gpu/             # wgpu context + scopes
│   │   ├── masks/           # JFA signed distance field masking
│   │   ├── neural_engine/   # Face detection, clip tagging
│   │   ├── plugin/          # Plugin host runtime
│   │   ├── state/           # CRDTs, keyframes, tombstones
│   │   └── time/            # MediaTime, FrameRate, TimeCode
│   ├── wasm/                # WASM bridge (all crates → JS)
│   ├── api-gateway/         # Axum REST gateway (:8005)
│   ├── cli/                 # Headless CLI renderer
│   ├── mcp-server/          # MCP protocol server
│   ├── p2p-sync/            # libp2p mesh networking
│   ├── plugin-api/          # Third-party plugin SDK
│   ├── provenance/          # Content authenticity (C2PA)
│   └── temporal-versioning/ # Timeline versioning + branching
├── services/                # Microservices (async offload)
│   ├── pre-processing/      # Python FastAPI (:8000) — Whisper, SAM2
│   ├── generative-studio/   # Python FastAPI (:8001) — AI gen
│   ├── ai-agents/           # Node.js (:8002) — Lazynext AI Agent Copilot
│   ├── render-service/      # Node.js (:8003) — FFMPEG farm
│   ├── collab-server/       # Rust (:8004) — CRDT sync + WebRTC
│   └── analytics-service/   # Node.js (:8006) — Data ingestion
├── packages/                # Shared packages (api-client)
├── plugins/                 # Plugin SDK and examples
├── infra/terraform/         # Azure infrastructure as code
├── k8s/                     # Kubernetes manifests (optional AKS)
├── monitoring/              # Prometheus, Grafana, Loki, Tempo
├── scripts/                 # Build and automation scripts
├── config/                  # Traefik ingress configuration
└── docs/                    # Mastery documentation framework
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Business logic location | `rust/` workspace exclusively | Never duplicated; single source of truth |
| UI approach | Dumb shells calling into Rust | Each platform gets optimal framework; logic shared |
| State sync | CRDTs (LWW-Register + CmRDT) | Conflict-free real-time multi-user editing |
| GPU rendering | wgpu (custom compositor) | Single API for WebGPU/Vulkan/Metal/DX12 |
| Export encoding | FFMPEG + type-safe filter graph | Avoids stringly-typed errors; supports 6+ formats |
| AI orchestration | Lazynext AI Agent Copilot (pluggable LLM) | Natural language → CRDT operations |
| Plugin system | VST3 host + shader SDK | Industry-standard audio; custom GPU effects |
| Content authenticity | C2PA specification | Cryptographic provenance for every edit |
| Graceful degradation | Local processing fallback | AI features work without API keys — no mock data |

## Conventions & Standards

### Code Style

| Convention | Standard |
|---|---|
| **Formatting (Rust)** | cargo fmt (rustfmt, default) |
| **Formatting (TS/JS)** | Biome (tabs, double quotes, 80 char) |
| **Formatting (Python)** | ruff format (PEP 8, 100 char) |
| **Linting (Rust)** | cargo clippy -- -D warnings |
| **Linting (TS/JS)** | ESLint (TypeScript strict, React hooks, a11y) |
| **Linting (Python)** | ruff check |
| **Naming (Rust)** | snake_case funcs/vars, CamelCase types |
| **Naming (TS)** | camelCase vars, PascalCase components |
| **File naming** | kebab-case (e.g., `project-context.md`) |

### Git Conventions

- Branching: `feature/XX-feature-name` from `main` (see `mastery.md`)
- Commits: `type(scope): description` (Conventional Commits)
- Types: feat, fix, docs, style, refactor, test, chore, perf, hotfix
- Branches are never deleted

### Environment Setup

```bash
# Install dependencies
bun install

# Build WASM (required before web dev)
./build-wasm.sh

# Configure environment
cp .env.example .env.local

# Database migrations
bun run db:generate && bun run db:migrate

# Start web dev server
bun run dev

# Bootstrap everything
./start-platform.sh
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | — | Auth secret (64 chars) |
| `STORAGE_PROVIDER` | No | `local` | `local` or `azure` |
| `LLM_PROVIDER` | No | — | `openai`, `anthropic`, `gemini`, or `ollama` |
| `OPENAI_API_KEY` | No | — | Whisper + GPT-4o features |
| `ANTHROPIC_API_KEY` | No | — | Claude-powered Lazynext AI Agent |
| `REPLICATE_API_TOKEN` | No | — | AI video generation |
| `ELEVENLABS_API_KEY` | No | — | AI dubbing |
| `NEXT_PUBLIC_*_URL` | No | localhost | Microservice URLs |
| `UPSTASH_REDIS_URL` | No | — | Rate limiting (required in prod) |
| `STRIPE_SECRET_KEY` | No | — | Payments |

## Scope & Constraints

### In Scope (v1.0)

- Web app with full timeline editor, canvas preview, AI copilot
- Desktop app with GPUI Dashboard + Editor, native wgpu compositor, DeckLink I/O, AI Copilot
- Mobile app with Expo navigation, EditorScreen, AI Copilot chat, NativeBridge
- Browser extension with video detection, capture, REST import, context menu notifications
- CRDT-based real-time collaboration with WebRTC voice chat
- GPU compositor (17 blend modes, 11 effect shaders, JFA masking)
- Audio engine (10-band EQ, compressor, VST host, stem separation)
- Export pipeline (MP4, ProRes, DCP, AAF, MOV, GIF) — compositor→ffmpeg WYSIWYG, all 7 formats
- AI: transcription, filler removal, speaker diarization, voice cloning, auto-reframe
- Plugin SDK (VST3 audio, custom shaders)
- REST API Gateway (Axum, JWT, RBAC, rate limiting, OpenAPI/Swagger UI)
- Headless CLI renderer (Clap-based, all formats, batch mode)
- MCP server (17 tools, 4 resources, 4 prompts, auth)
- Kafka analytics pipeline (kafkajs, SASL/SSL, in-mem fallback)
- collab-server with PostgreSQL CRDT persistence (sqlx)
- P2P mesh networking (UDP broadcast + TCP CRDT delta exchange)
- OpenTelemetry across all 6 microservices
- Terraform-managed Azure infrastructure with CI/CD
- Full E2E pipeline test driver: `scripts/full-e2e.sh`

### Out of Scope (v1.0)

- 3D camera tracking and advanced VFX compositing
- Direct social media publishing APIs (social-publish module exists in render-service but platforms require OAuth — deferred)
- libp2p DHT upgrade for p2p-sync (UDP/TCP mesh works; libp2p is documented enhancement)

### Known Constraints

- WASM bridge limits Rust-JS throughput for high-res real-time preview
- wgpu maturity on mobile browsers is limited
- GPUI (Zed framework) is not a stable 1.0 dependency
- Platform is code-complete (~98%) — remaining work is operational (deployment, profiling, hardening)

## Team & Roles

| Role | Who | Responsibilities |
|---|---|---|
| **Lead / Owner** | Lazynext Team | Final decisions, merge approval |
| **AI Agent** | Any (Claude, Copilot, etc.) | Implementation within Mastery framework |
| **Contributors** | Open source | Feature work, reviews |
