# Lazynext Developer Onboarding Guide

Welcome to Lazynext — a multi-platform video editing ecosystem. This guide walks you from zero to productive, covering every corner of the codebase and the workflows you will use every day.

---

## 1. What is Lazynext?

Lazynext is an **AI-native video editor** that replaces manual timeline operations with natural-language commands. A user types "add Hormozi captions, speed ramp this clip, publish to TikTok" and the Chronos Copilot translates intent into CRDT state patches that drive the rendering engine.

The codebase follows one non-negotiable principle: **Rust owns all business logic.** Every application under `apps/` is a dumb rendering shell that calls into Rust — via WASM on the web, natively on desktop. Logic is never duplicated between apps.

---

## 2. Prerequisites

Install these tools before anything else. Versions listed are minimums; newer patch releases are fine.

| Tool | Version | Why |
|------|---------|-----|
| **Rust** (rustup) | 1.96+ | All business logic lives in `rust/`. Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh`. |
| **Bun** | 1.3.14+ | Package manager and JS runtime for the monorepo. Install via `curl -fsSL https://bun.sh/install \| bash`. |
| **wasm-pack** | latest | Compiles Rust crates to WebAssembly for the web app. Install via `cargo install wasm-pack`. |
| **Docker** + Docker Compose | 24+ | Runs PostgreSQL, Redis, and optional full-platform deploys. Install from docker.com. |
| **Python** | 3.13+ | Required for the pre-processing and generative-studio microservices. |
| **Node.js** | 22+ | Required by some tooling; Bun covers most JS needs, but `npx` and `node` are sometimes used directly. |
| **Git** | 2.40+ | Version control. |

### Platform-specific notes

| Platform | Extra steps |
|----------|------------|
| **macOS** | `brew install cmake pkg-config openssl` (rust-bindgen / ffmpeg-sys-next deps). Apple Silicon is fully supported. |
| **Linux** | `apt install build-essential cmake pkg-config libssl-dev libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev` (for GPUI desktop shell). |
| **Windows** | Use WSL2. Native Windows builds are not supported for desktop or microservices. |

---

## 3. First-Time Setup

Complete these steps in order.

### 3.1 Clone and install dependencies

```bash
git clone git@github.com:your-org/lazynext.git
cd Lazynext

# Install all workspace dependencies (monorepo — does apps/, services/, packages/)
bun install
```

### 3.2 Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at minimum:

| Variable | Minimum value |
|----------|---------------|
| `DATABASE_URL` | A reachable PostgreSQL instance (Docker Compose provides one). |
| `BETTER_AUTH_SECRET` | 64 random characters: `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |

All AI keys (`OPENAI_API_KEY`, etc.) are optional — services gracefully degrade to local processing when keys are absent.

### 3.3 Start infrastructure (Postgres + Redis)

```bash
docker compose up -d redis db redis-proxy
```

### 3.4 Push database schema

```bash
cd apps/web
bun run db:generate   # Generate Drizzle migrations from schema
bun run db:migrate    # Run pending migrations
```

### 3.5 Build the Rust WASM core

```bash
./build-wasm.sh
```

This compiles the entire `rust/wasm` crate into `rust/wasm/pkg/`, which the web app imports as `lazynext-wasm`.

### 3.6 Start the web app

```bash
bun run dev
# Or from the root:
# cd apps/web && bun run dev
```

Open **http://localhost:3000**. You should see the Lazynext editor.

### 3.7 Start optional microservices

```bash
# From root — starts everything with one command
./start-platform.sh

# Or manually:
cd services/ai-agents && bun run start          # :8002 — Chronos Copilot + CRDT sync
cd services/render-service && bun run start     # :8003 — FFMPEG render farm
cd services/pre-processing && uvicorn main:app --port 8000   # :8000 — Whisper / SAM2
cd services/generative-studio && uvicorn main:app --port 8001 # :8001 — Diffusion / TTS
```

### 3.8 Run tests to verify

```bash
bun run test              # All workspace unit tests
cargo test --workspace    # All Rust tests
bun run typecheck         # TypeScript type-check
```

---

## 4. Architecture Overview

### 4.1 The hard rule: business logic in Rust

```
User action (UI)
    │
    ▼
  apps/web (React, canvas rendering, event handling)
    │
    ▼  WASM call (lazynext-wasm)
    │
rust/crates/* (state, compositor, effects, audio, export, ...)
    │
    ▼  REST / gRPC
    │
services/* (AI, rendering, transcription)
```

- **Never** put domain rules (e.g., "what happens when a clip overlaps another") in the UI. That goes in Rust.
- **Never** duplicate logic between `apps/web`, `apps/desktop`, and `apps/mobile`. Abstract it into Rust instead.

### 4.2 Crates map (the "org chart" of business logic)

| Crate | Directory | Responsibility |
|-------|-----------|----------------|
| `state` | `rust/crates/state` | CRDT types: LWW-Register, ops, vector clocks, tombstones, keyframes |
| `compositor` | `rust/crates/compositor` | GPU compositor with 18 blend modes, ACES tonemapping, SDF rendering |
| `editor_core` | `rust/crates/editor_core` | Silence detection, scene detection algorithms |
| `effects` | `rust/crates/effects` | 6 GPU effect shaders (film emulation, optical flow, etc.) |
| `audio` | `rust/crates/audio` | DSP pipeline: EQ, compressor, VST host |
| `export` | `rust/crates/export` | FFMPEG encoding: MP4, ProRes, DCP, AAF |
| `ffmpeg_filter` | `rust/crates/ffmpeg_filter` | Type-safe FFMPEG filter graph builder |
| `gpu` | `rust/crates/gpu` | wgpu context management + WGSL scope analyzer |
| `masks` | `rust/crates/masks` | JFA signed distance field masking |
| `neural_engine` | `rust/crates/neural_engine` | Face detection, clip tagging, smart bins |
| `time` | `rust/crates/time` | MediaTime, FrameRate, TimeCode types |
| `plugin` | `rust/crates/plugin` | Third-party plugin host runtime |
| `bridge` | `rust/crates/bridge` | Inter-crate communication bridge |
| `decklink` | `rust/crates/decklink` | Blackmagic DeckLink I/O |
| `wasm` | `rust/wasm` | WASM bridge — all crates exposed to JavaScript |

### 4.3 Apps (UI shells)

| App | Directory | Stack | Notes |
|-----|-----------|-------|-------|
| **Web** | `apps/web` | Next.js 16 (App Router) + React 19 + TailwindCSS | Primary app. Imports Rust via WASM. |
| **Desktop** | `apps/desktop` | GPUI (Zed framework) + wgpu | Native Rust shell calling crates directly. |
| **Mobile** | `apps/mobile` | React Native + UniFFI bindings | iOS / Android. |
| **Browser Extension** | `apps/browser-extension` | Chrome Extension API | Captures video from browser into timeline. |

### 4.4 Microservices

| Service | Dir | Stack | Port | Purpose |
|---------|-----|-------|------|---------|
| **Pre-Processing** | `services/pre-processing` | Python FastAPI | 8000 | Whisper transcription, SAM2 rotoscoping, NeRF |
| **Generative Studio** | `services/generative-studio` | Python FastAPI | 8001 | Stable Video Diffusion, ElevenLabs dubbing, Demucs |
| **AI Agents** | `services/ai-agents` | Bun + Node.js | 8002 | Chronos Copilot LLM orchestration, CRDT WebSocket sync |
| **Render Service** | `services/render-service` | Bun | 8003 | FFMPEG render farm with SSE progress streaming |

### 4.5 Key data flow: how a timeline edit works

1. User drags a clip on the canvas in `apps/web`.
2. The timeline controller (`apps/web/src/components/editor/timeline/core/`) emits a command object.
3. The command (`apps/web/src/commands/timeline/`) mutates CRDT state in-memory.
4. On every state change, the WASM compositor (`rust/crates/compositor`) recomputes the frame.
5. If collaboration is active, the CRDT delta is synced to `services/ai-agents` via WebSocket, which fans it out to other peers using the vector clock for causal ordering.

### 4.6 CRDT state management

All editor state uses Conflict-free Replicated Data Types so multiple users can edit simultaneously without locks. Key types live in `rust/crates/state/src/`:

- `crdt.rs` — `LWWRegister<T>` (Last-Writer-Wins Register)
- `operations.rs` — operation-based CRDTs with causal deltas
- `vector_clock.rs` — vector clocks for partial ordering
- `keyframe.rs` — interpolatable keyframe data
- `tombstone.rs` — tombstone-based deletion (soft delete with cleanup)

On the JS side, CRDT sync is wired in `apps/web/src/collaboration/crdt-sync.ts`.

---

## 5. Development Workflow

### 5.1 Typical inner loop

```bash
# Terminal 1: Wasm auto-rebuild on Rust changes
cd rust/wasm && cargo watch -s 'wasm-pack build --target web --release'

# Terminal 2: Next.js dev server (hot reload on TS/JSX changes)
cd apps/web && bun run dev

# Terminal 3 (optional): microservice you're working on
cd services/ai-agents && bun run start
```

Rust changes require a WASM rebuild. TS/JSX changes are hot-reloaded by Next.js instantly.

### 5.2 Before committing

```bash
# Rust
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

# TypeScript / Web
bun run typecheck
bun run lint
bun run test
```

The CI pipeline (`.github/workflows/ci.yml`) runs all of the above. PRs with lint or type errors will be blocked.

### 5.3 Branching conventions

- Branch from `main`.
- Name branches: `feat/description`, `fix/description`, `chore/description`.
- Commit messages follow conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Every commit message must end with `Co-Authored-By: Claude <noreply@anthropic.com>`.

### 5.4 Code review checklist

Before requesting a review:
- [ ] No `console.log` in production code paths.
- [ ] Accessibility: semantic HTML, ARIA roles, keyboard handlers, alt text.
- [ ] All props have TypeScript types (no `any`).
- [ ] Logic is in Rust, not duplicated across UI shells.
- [ ] Read existing UI components before creating new ones — they may already apply the classes you need.
- [ ] No enums — use `as const` discriminated unions.

---

## 6. Key Commands Reference

### 6.1 Root workspace (Bun)

```bash
bun install                    # Install all workspace dependencies
bun run dev                    # Start all apps in dev mode
bun run build                  # Build all apps for production
bun run lint                   # Lint all packages
bun run typecheck              # TypeScript check entire workspace
bun run test                   # Run tests across workspace
bun run docker:up              # docker compose up --build -d (all 8 services)
bun run docker:down            # docker compose down
```

### 6.2 Rust

```bash
./build-wasm.sh                          # Build WASM (required before web app)
cargo build --workspace                  # Build all crates
cargo test --workspace                   # Test all crates
cargo fmt --all                          # Format all Rust code
cargo clippy --workspace --all-targets -- -D warnings   # Lint all Rust code
```

### 6.3 Web app (`apps/web`)

```bash
bun run dev          # Next.js dev server (:3000)
bun run test         # Bun unit tests
bun run test:e2e     # Playwright E2E tests
bun run typecheck    # tsc --noEmit
bun run lint         # ESLint
bun run db:generate  # Generate Drizzle migrations from schema
bun run db:migrate   # Run pending migrations
```

### 6.4 Microservices

```bash
# Pre-Processing (:8000)
cd services/pre-processing && uvicorn main:app --reload --port 8000

# Generative Studio (:8001)
cd services/generative-studio && uvicorn main:app --reload --port 8001

# AI Agents (:8002)
cd services/ai-agents && bun run start

# Render Service (:8003)
cd services/render-service && bun run start
```

### 6.5 One-shot bootstrap

```bash
./start-platform.sh    # Kills stale processes, starts everything
```

---

## 7. Project Structure Tour

```
Lazynext/
├── apps/
│   ├── web/                    # Next.js 16 — primary app (App Router)
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages and layouts
│   │   │   ├── commands/       # Command pattern (undo/redo): timeline, project, scene, media
│   │   │   ├── components/
│   │   │   │   ├── editor/     # Canvas, timeline, panels, inspector
│   │   │   │   │   └── timeline/
│   │   │   │   │       ├── core/        # Main controller, element types
│   │   │   │   │       ├── controllers/ # Drag-drop, resize, playhead, zoom
│   │   │   │   │       ├── placement/   # Element placement + overlap resolution
│   │   │   │   │       └── snapping/    # Snap-to-grid / snap-to-element
│   │   │   │   └── ui/         # shadcn/ui derivatives with glassmorphism
│   │   │   ├── collaboration/  # CRDT sync, WebSocket, multiplayer state
│   │   │   ├── db/             # Drizzle ORM schema (schema.ts) + migrations
│   │   │   ├── editor/         # Agent chat, editor store, multicam, smart bins
│   │   │   ├── effects/        # Effect definitions, registry, types
│   │   │   ├── hooks/          # Shared React hooks
│   │   │   ├── lib/            # Utility functions
│   │   │   ├── preview/        # Fabric.js preview canvas
│   │   │   ├── services/       # Service clients, storage layer with migrations
│   │   │   └── drizzle/        # Generated SQL migrations
│   │   ├── e2e/                # Playwright end-to-end tests
│   │   └── next.config.ts
│   ├── desktop/                # GPUI (Zed framework) native desktop app
│   ├── mobile/                 # React Native mobile app
│   └── browser-extension/      # Chrome extension
│
├── rust/
│   ├── Cargo.toml              # Workspace manifest
│   ├── core/                   # NLE engine: state mgmt, autonomous editor, timeline
│   ├── wasm/                   # WASM bridge: all crates → JavaScript (lazynext-wasm)
│   ├── api-gateway/            # Axum REST gateway (:8005)
│   ├── cli/                    # Headless CLI renderer
│   ├── mcp-server/             # MCP protocol server for AI agent tool use
│   ├── p2p-sync/               # libp2p mesh networking
│   ├── provenance/             # Content authenticity (C2PA-style)
│   ├── temporal-versioning/    # Timeline versioning and branching
│   ├── plugin-api/             # 3rd-party plugin SDK
│   └── crates/
│       ├── state/              # CRDT, keyframes, vector clocks, tombstones
│       ├── compositor/         # GPU compositor (18 blend modes, ACES)
│       ├── editor_core/        # Silence detection, scene detection
│       ├── effects/            # 6 GPU effect shaders
│       ├── audio/              # DSP: EQ, compressor, VST host
│       ├── export/             # FFMPEG encoding pipeline
│       ├── ffmpeg_filter/      # Type-safe FFMPEG filter graph builder
│       ├── gpu/                # wgpu context + scopes analyzer
│       ├── masks/              # JFA signed distance field masking
│       ├── neural_engine/      # Face detection, clip tagging, smart bins
│       ├── time/               # MediaTime, FrameRate, TimeCode
│       ├── plugin/             # Plugin host runtime
│       ├── bridge/             # Inter-crate communication
│       └── decklink/           # Blackmagic DeckLink I/O
│
├── services/
│   ├── pre-processing/         # Python FastAPI: Whisper, SAM2, NeRF (:8000)
│   ├── generative-studio/      # Python FastAPI: Diffusion, TTS, Demucs (:8001)
│   ├── ai-agents/              # Bun: Chronos Copilot + CRDT WebSocket (:8002)
│   ├── render-service/         # Bun: FFMPEG render farm + SSE (:8003)
│   ├── analytics-service/      # Analytics pipeline
│   └── collab-server/          # WebSocket collaboration server
│
├── packages/
│   └── api-client/             # Shared API client used across apps
│
├── scripts/                    # Infrastructure / build / deploy / DB scripts
├── plugins/                    # System extension points
├── terraform/azure/            # Infrastructure-as-code for Azure deployment
├── k8s/                        # Kubernetes manifests (optional)
├── ansible/                    # Configuration management
├── monitoring/                 # Prometheus / Grafana configs
├── notes/                      # Developer notes (unstructured)
│
├── docs/                       # All project documentation
│   ├── architecture.md         # System architecture and design principles
│   ├── COMPLETE_PLATFORM_OVERVIEW.md  # Feature parity master list
│   ├── effects-renderer.md     # Effect rendering pipeline docs
│   ├── keyframes.md            # Keyframe interpolation docs
│   ├── missing_features.md     # Known gaps and roadmap
│   ├── openapi.yaml            # REST API specification
│   ├── actions.md              # GitHub Actions / CI documentation
│   ├── runbooks/               # Operational runbooks
│   └── adrs/                   # Architecture Decision Records
│       ├── 001-rust-core.mdx
│       ├── 002-crdt-state.mdx
│       └── 003-wgpu-compositor.mdx
│
├── .github/workflows/
│   ├── ci.yml                  # PR checks: lint, typecheck, test
│   └── production.yml          # Production deployment pipeline
│
├── .env.example                # Template for .env.local
├── build-wasm.sh               # Rust → WASM build script
├── start-platform.sh           # One-shot local platform bootstrap
├── docker-compose.yml          # Full platform container definition
├── biome.json                  # Formatter config (tabs, double quotes, 80 chars)
├── eslint.config.mjs           # ESLint (TypeScript strict, React, a11y)
├── package.json                # Root workspace — Bun monorepo
└── CLAUDE.md                   # Codebase guide for AI assistants
```

---

## 8. Where to Find Documentation

| If you need to understand... | Read this |
|------------------------------|-----------|
| Why the system is architected this way | `docs/architecture.md` |
| All features the platform supports | `docs/COMPLETE_PLATFORM_OVERVIEW.md` |
| How effects are rendered | `docs/effects-renderer.md` |
| Keyframe system | `docs/keyframes.md` |
| REST API surface | `docs/openapi.yaml` |
| Architectural decisions and their rationale | `docs/adrs/001-rust-core.mdx`, `002-crdt-state.mdx`, `003-wgpu-compositor.mdx` |
| Known gaps and upcoming work | `docs/missing_features.md` |
| CI/CD pipeline details | `docs/actions.md` |
| Operational procedures | `docs/runbooks/` |
| AI assistant guidance | `CLAUDE.md` (root) |
| CRDT types and operations | `rust/crates/state/src/crdt.rs` (source + module docs) |
| Command pattern implementation | `apps/web/src/commands/base-command.ts` |
| Database schema | `apps/web/src/db/schema.ts` |
| Effect pipeline | `rust/crates/effects/src/pipeline.rs` |
| Compositor blend modes | `rust/crates/compositor/src/blend_mode.rs` |

---

## 9. Common Tasks

### 9.1 Add a new video/audio effect

A typical walkthrough for adding a new effect (e.g., "VHS Glitch"):

**Step 1: Define the effect type in Rust** (`rust/crates/effects/src/types.rs`)
- Add a new variant to the effect enum.
- Define its parameters (struct with `#[derive(Serialize, Deserialize)]`).

**Step 2: Implement the WGSL shader** (`rust/crates/effects/src/shaders/`)
- Write the WGSL compute/render shader. Keep it in a `vhs_glitch.wgsl` file.
- Register it in the effect pipeline (`rust/crates/effects/src/pipeline.rs`).

**Step 3: Wire into the compositor** (`rust/crates/compositor/src/compositor.rs`)
- Add the new effect to the render pass dispatch match.

**Step 4: Expose via WASM** (`rust/wasm/src/` — the effect module)
- Ensure the effect struct has `wasm_bindgen` getters/setters for its parameters.

**Step 5: Add the JS effect definition** (`apps/web/src/effects/definitions/`)
- Create a new file exporting the effect's display name, default params, and parameter schema.
- Register it in `apps/web/src/effects/registry.ts`.

**Step 6: Add UI controls** (`apps/web/src/effects/components/`)
- Create a React component for the effect parameter panel.
- Import and use existing UI components from `apps/web/src/components/ui/`.

**Step 7: Add command wrappers** (`apps/web/src/commands/`)
- If the effect changes editor state, wrap the mutation in a command for undo/redo support.

**Step 8: Rebuild WASM**
```bash
./build-wasm.sh
```

### 9.2 Add a new REST API endpoint to the API gateway

The API gateway is an Axum server at `rust/api-gateway/src/`.

**Step 1: Define the route**
- In `routes.rs` (or the relevant module), add a new handler:
```rust
pub async fn my_endpoint(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<MyPayload>,
) -> Result<Json<MyResponse>, ApiError> {
    // Business logic here
}
```

**Step 2: Register the route**
- In `main.rs`, add `.route("/api/v1/my-resource", post(my_endpoint))` to the router.

**Step 3: Update the OpenAPI spec**
- Add the new endpoint to `docs/openapi.yaml`.

**Step 4: Update the JS API client** (`packages/api-client/src/`)
- Add a typed fetch wrapper so the web app can call the endpoint.

**Step 5: Test**
```bash
cargo test --package api-gateway
```

### 9.3 Add a new microservice endpoint

Example: adding a new transcription format to the pre-processing service.

**Step 1: Add the Python route** (`services/pre-processing/main.py`)
```python
@app.post("/transcribe/{format}")
async def transcribe_format(format: str, file: UploadFile):
    # Implementation
    pass
```

**Step 2: Add the service client in the web app** (`apps/web/src/services/`)
- Create or update the typed fetch wrapper for the new endpoint.

**Step 3: Add the environment variable** (if new service)
- Add `NEXT_PUBLIC_*_URL` to `.env.example` and the web app's env config (`apps/web/src/env/`).

**Step 4: Test locally**
```bash
cd services/pre-processing
uvicorn main:app --reload --port 8000
# Then:
curl -X POST http://localhost:8000/transcribe/srt -F "file=@test.mp4"
```

### 9.4 Add a new smart bin rule

Smart bins automatically categorize clips using the neural engine.

**Step 1: Define the rule in Rust** (`rust/crates/neural_engine/src/`)
- Add the rule logic: face count threshold, scene type classification, audio level gate, etc.

**Step 2: Expose via WASM** (`rust/wasm/src/`)
- Bind the rule evaluator.

**Step 3: Add the bin UI** (`apps/web/src/editor/smart-bins.tsx`)
- Add the bin definition, display name, and icon.

### 9.5 Add a new timeline element type

**Step 1: Define the element in Rust state** (`rust/crates/state/src/`)
- Add the element struct with CRDT support.

**Step 2: Add the element type in the compositor** (`rust/crates/compositor/`)
- Teach the compositor how to render it.

**Step 3: Add the JS element** (`apps/web/src/components/editor/timeline/core/elements/`)
- Create the element class, implementing the visitor pattern for serialization/deserialization.
- Register it in the element factory.

**Step 4: Add commands** (`apps/web/src/commands/timeline/element/`)
- AddElement, RemoveElement, MoveElement commands for undo/redo.

---

## 10. Testing Guide

### 10.1 Rust tests

```bash
# Run all tests
cargo test --workspace

# Run a specific crate
cargo test --package state

# Run with output
cargo test -- --nocapture

# Run a specific test
cargo test --package compositor -- test_blend_mode_multiply
```

**Conventions:**
- Unit tests live in the same file as the code (`#[cfg(test)] mod tests { ... }`).
- Integration tests go in `tests/` directories within each crate.
- Property-based tests use `proptest`.
- WGSL shader tests validate against reference images.

### 10.2 Web app tests (Bun)

```bash
cd apps/web
bun run test              # All unit tests
bun run test -- --watch   # Watch mode
```

**Conventions:**
- Test files are co-located with source: `foo.test.ts` alongside `foo.ts`.
- Use `describe`/`it` blocks.
- Mock external services at the fetch level with `bun`'s built-in mock support.

### 10.3 E2E tests (Playwright)

```bash
cd apps/web
bun run test:e2e          # All E2E tests
```

**Conventions:**
- Tests live in `apps/web/e2e/`.
- Use Playwright fixtures for authenticated sessions.
- Test critical user journeys: sign-up, create project, add clip, export.

### 10.4 Python microservice tests

```bash
cd services/pre-processing
python -m pytest tests/

cd services/generative-studio
python -m pytest tests/
```

### 10.5 CI pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR:
1. `bun install`
2. Rust: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace`
3. Web: `bun run typecheck`, `bun run lint`, `bun run test`
4. Build: `bun run build` (ensures production build succeeds)
5. E2E: Playwright tests (selective — critical paths only)

---

## 11. Troubleshooting

### WASM build fails

| Symptom | Fix |
|---------|-----|
| `wasm-pack: command not found` | `cargo install wasm-pack` |
| `error: linking with cc failed` | Install `build-essential` (Linux) or Xcode CLT (macOS) |
| `error[E0463]: can't find crate for core` | Update Rust: `rustup update stable` |
| `getrandom` errors on wasm32 target | Ensure `RUSTFLAGS="--cfg getrandom_backend=\"wasm_js\""` is set (done by `build-wasm.sh`) |

### Database / migrations

| Symptom | Fix |
|---------|-----|
| `cannot connect to postgres` | Is Docker running? `docker compose up -d db` |
| `relation does not exist` | Run `bun run db:migrate` in `apps/web/` |
| Migration conflicts | Check `apps/web/src/drizzle/` — never edit auto-generated files |

### Dev server won't start

| Symptom | Fix |
|---------|-----|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` (or use `./start-platform.sh` which cleans up) |
| `Cannot find module 'lazynext-wasm'` | Run `./build-wasm.sh` first |
| `Module not found: Can't resolve '...'` | Run `bun install` from the root |
| Next.js compile errors | Delete `apps/web/.next` and `node_modules/.cache`, then restart |

### Docker / microservices

| Symptom | Fix |
|---------|-----|
| Docker daemon not running | Start Docker Desktop |
| `docker compose` fails | `docker compose down -v && docker compose up --build -d` |
| Microservice won't start | Check env vars: `grep NEXT_PUBLIC_ .env.local` |
| Port already bound | `lsof -ti:8000,8001,8002,8003 \| xargs kill -9` |

### Rust-specific

| Symptom | Fix |
|---------|-----|
| `error: could not compile` after pulling | `cargo clean && cargo build` |
| `unused import` warnings becoming errors in CI | `cargo clippy --workspace --all-targets -- -D warnings` and fix before pushing |
| `cargo fmt` changes many files | Run `cargo fmt --all` locally — CI checks for exact match |

### Editor-specific

| Symptom | Fix |
|---------|-----|
| Timeline renders blank | Check browser console for WASM errors; rebuild WASM |
| CRDT sync not working | Ensure `services/ai-agents` is running and `NEXT_PUBLIC_AI_AGENTS_URL` is set |
| Effects panel is empty | Check that effect definitions are registered in `apps/web/src/effects/registry.ts` |

### Still stuck?

1. Read `CLAUDE.md` at the repo root — it is the canonical codebase guide.
2. Check `docs/runbooks/` for operational procedures.
3. Look at recently closed PRs for similar work.
4. Run `bun run typecheck` and `cargo clippy` — the compiler often surfaces the issue.

---

## 12. Additional Resources

| Resource | Location |
|----------|----------|
| Architecture Decision Records | `docs/adrs/` |
| ADR 001: Why Rust Core | `docs/adrs/001-rust-core.mdx` |
| ADR 002: Why CRDT State | `docs/adrs/002-crdt-state.mdx` |
| ADR 003: Why wgpu Compositor | `docs/adrs/003-wgpu-compositor.mdx` |
| Feature parity master list | `docs/COMPLETE_PLATFORM_OVERVIEW.md` |
| Effect rendering pipeline | `docs/effects-renderer.md` |
| Keyframe interpolation | `docs/keyframes.md` |
| REST API specification | `docs/openapi.yaml` |
| Operational runbooks | `docs/runbooks/` |
| Missing features / roadmap | `docs/missing_features.md` |
| CI/CD documentation | `docs/actions.md` |
| Infrastructure scripts | `scripts/` |
| Terraform (Azure) | `terraform/azure/` |
| Kubernetes manifests | `k8s/` |
| Monitoring configs | `monitoring/` |

---

Welcome aboard. When in doubt, read the code — `rust/crates/state/src/crdt.rs` is a great place to start understanding the core data model.

