# CLAUDE.md (updated 2026-07-01)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Platform is at ~98% code-complete — all 31 features shipped.

## Architecture

Lazynext is a multi-platform video editing ecosystem. **Rust owns all business logic**; every app under `apps/` is a dumb rendering shell that calls into Rust (via WASM on web, natively on desktop). Logic is never duplicated between apps.

### Rust Core (`rust/`)

The single source of truth for all non-UI code. No components, no hooks, no framework imports allowed here.

| Package | Purpose |
|---------|---------|
| `rust/core` | NLE engine: state management, autonomous editor, timeline logic |
| `rust/crates/state` | CRDT (LWW-Register + operation-based), keyframes, vector clocks, tombstones |
| `rust/crates/compositor` | GPU compositor with 17 blend modes |
| `rust/crates/editor_core` | Silence detection, scene detection |
| `rust/crates/effects` | 11 GPU effect shaders |
| `rust/crates/audio` | DSP: EQ, compressor, VST host |
| `rust/crates/export` | FFMPEG encoding pipeline (MP4, ProRes, DCP, AAF) |
| `rust/crates/ffmpeg_filter` | Type-safe FFMPEG filter graph builder |
| `rust/crates/gpu` | wgpu context + scopes analyzer |
| `rust/crates/masks` | JFA signed distance field masking |
| `rust/crates/neural_engine` | Face detection, clip tagging, smart bins |
| `rust/crates/time` | MediaTime, FrameRate, TimeCode |
| `rust/crates/plugin` | Plugin host runtime |
| `rust/crates/bridge` | Inter-crate communication bridge |
| `rust/crates/decklink` | Blackmagic DeckLink I/O |
| `rust/wasm` | WASM bridge binding all crates → JavaScript (`lazynext-wasm`) |
| `rust/api-gateway` | Axum REST gateway on port 8005 |
| `rust/cli` | Headless CLI renderer |
| `rust/mcp-server` | MCP protocol server for AI agent integration |
| `rust/p2p-sync` | UDP/TCP mesh networking for peer-to-peer CRDT sync (libp2p/DHT as future enhancement) |
| `rust/provenance` | Content provenance and authenticity tracking |
| `rust/temporal-versioning` | Timeline versioning and branching |
| `rust/plugin-api` | Third-party plugin SDK (API surface definitions) |
| `rust/crates/plugin` | Plugin host runtime (actual implementation) |

### Apps (UI Shells)

- **`apps/web`** — Next.js 16 (App Router) + React 19. Imports Rust via WASM (`lazynext-wasm`). Uses TailwindCSS with Premium Glassmorphism styling.
- **`apps/desktop`** — GPUI (Zed framework) calling Rust natively with wgpu rendering.
- **`apps/mobile`** — React Native with UniFFI-generated native bindings.
- **`apps/browser-extension`** — Chrome extension for capturing video into the timeline.
- **`apps/cli`** — JS/TS CLI application for scripted workflows.
- **`apps/extension`** — Additional Chrome extension variant.

### Backend Microservices (`services/`)

All services communicate via REST over the `lazynext-network` Docker bridge.

| Service | Stack | Port | Purpose |
|---------|-------|------|---------|
| `pre-processing` | Python FastAPI | 8000 | Whisper transcription, SAM2 rotoscoping, NeRF extraction |
| `generative-studio` | Python FastAPI | 8001 | Stable Video Diffusion, ElevenLabs dubbing, Demucs stem separation |
| `ai-agents` | Node.js (Bun) | 8002 | Chronos Copilot LLM orchestration + CRDT WebSocket sync server |
| `render-service` | Node.js (Bun) | 8003 | FFMPEG render farm with SSE progress streaming |
| `collab-server` | Rust (Axum) | 8004 | Native CRDT sync server + WebRTC signaling |
| `mcp-server` | Node.js (Bun) | stdio | Node.js MCP protocol server |
| `analytics-service` | Node.js (Bun) | 8006 | High-velocity data ingestion and LTV calculation engine |

### Infrastructure

- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml` and `.github/workflows/production.yml`)
- **Deployment**: Azure Container Apps (8 services) + Azure PostgreSQL Flexible Server with private VNet. Optional AKS for GPU workloads.
- **Terraform**: Azure infrastructure-as-code in `terraform/`
- **Kubernetes**: Optional K8s manifests in `k8s/`
- **Database**: PostgreSQL via Drizzle ORM (schema: `apps/web/src/db/schema.ts`, migrations: `apps/web/src/drizzle/`)
- **Auth**: better-auth library with Upstash Redis rate limiting
- **Payments**: Stripe integration
- **Email**: Resend

## Development Commands

### Setup

```bash
bun install                    # Install all workspace dependencies
cp .env.example .env.local     # Create local env (fill in required values)
```

### Rust

```bash
# Build WASM (required before running the web app)
./build-wasm.sh
# Or manually:
wasm-pack build --target web rust/wasm

# Test entire workspace
cargo test --workspace

# Lint
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

### Web App (`apps/web`)

```bash
bun run dev          # Start Next.js dev server (:3000)
bun run test         # Unit tests (Bun test runner)
bun run test:e2e     # Playwright E2E tests
bun run typecheck    # TypeScript check (tsc --noEmit)
bun run lint         # ESLint

# Database
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run pending migrations
```

The web app prebuild step (`bun run prebuild`) automatically calls `./build-wasm.sh`.

### Python Microservices

```bash
# Pre-Processing
cd services/pre-processing
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Generative Studio
cd services/generative-studio
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Node Microservices

```bash
# Each runs with Bun
cd services/ai-agents && bun run start       # :8002
cd services/render-service && bun run start   # :8003
cd services/analytics-service && bun run start # :8006
```

### Rust Microservices

```bash
# Collab server (native CRDT sync)
cd services/collab-server && cargo run         # :8004
```

### Docker (Full Platform)

```bash
docker compose up --build -d     # Start all 8 services
```

### Bootstrap Everything Locally

```bash
./start-platform.sh              # Kills stale processes, starts all 8 services
```

## Key Patterns

### CRDT State Management

All editor state uses CRDTs for conflict-free real-time collaboration. The core types live in `rust/crates/state/src/`:
- `crdt.rs` — Last-Writer-Wins Register (`LWWRegister<T>`)
- `operations.rs` — Operation-based CRDTs
- `vector_clock.rs` — Vector clocks for causal ordering
- `keyframe.rs` — Keyframe data types
- `tombstone.rs` — Tombstone-based deletion

On the JS side, CRDT sync is wired in `apps/web/src/collaboration/crdt-sync.ts`.

### Command Pattern (Undo/Redo)

All state mutations go through the command system in `apps/web/src/commands/`. Every operation (add element, delete track, change effect param) is a command that can be inverted for undo. The timeline commands follow a visitor pattern (`commands/timeline/element/`).

### Timeline Rendering

The timeline is a canvas-based implementation at `apps/web/src/components/editor/timeline/`:
- `core/editor/timeline.editor.ts` — Main timeline controller
- `core/elements/` — Element types (video, audio, text, etc.) with visitor pattern for serialization/deserialization
- `controllers/` — Drag-drop, resize, playhead, zoom controllers
- `placement/` — Element placement and overlap resolution
- `snapping/` — Snap-to-grid and snap-to-element logic

### Storage Migrations

Project data stored in IndexedDB/OPFS has a versioned migration system at `apps/web/src/services/storage/migrations/` with 31+ sequential migrations (`v0-to-v1.ts` through `v30-to-v31.ts`). Each migration has a corresponding transformer.

### Preview/Canvas

The preview canvas (`apps/web/src/preview/`) renders the composition using Fabric.js for 2D canvas manipulation, with separate controllers for interaction and transform handles.

## Code Style

- **Package manager**: Bun with workspaces (`bun@1.3.14`). Never use npm/yarn commands.
- **Formatting**: Biome (`biome.json`) — tabs, double quotes, 80 char line width.
- **Linting**: ESLint (`eslint.config.mjs`) with TypeScript strict, React hooks, accessibility rules.
- **TypeScript**: Strict mode, no enums, no `any`, prefer `as const`, use `import type` / `export type`.
- **Tests**: Bun test runner for unit tests (`bun test`), Playwright for E2E.
- **React**: Use existing components from `apps/web/src/components/ui/` (shadcn/ui derivatives with glassmorphism). Read a component before using it — it may already apply classes.
- **No console.log** in production code — the copilot instructions forbid it.
- **Accessibility**: Full a11y rules enforced — semantic elements, ARIA roles, keyboard handlers, alt text.

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `BETTER_AUTH_SECRET` | Auth secret (required, 64 chars) |
| `STORAGE_PROVIDER` | `local` or `azure` |
| `LLM_PROVIDER` | `openai`, `anthropic`, `gemini`, or `ollama` |
| `NEXT_PUBLIC_*_URL` | Microservice URLs (default localhost) |

Services gracefully degrade to local processing when API keys are absent — no mock data in production.
