# Contributing to Lazynext

Welcome! Lazynext is an enterprise-grade, multi-platform AI-native Non-Linear Video Editor (NLE) built on Rust + WASM + TypeScript + Python. This guide will help you get oriented and productive.

---

## Table of Contents

1. [Architecture Rule](#architecture-rule)
2. [Project Layout](#project-layout)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Code Style](#code-style)
6. [Commit Conventions](#commit-conventions)
7. [Pull Request Process](#pull-request-process)
8. [Testing Requirements](#testing-requirements)
9. [Adding New Features](#adding-new-features)
10. [CRDT Operations](#crdt-operations)
11. [Feature Workflow (Mastery)](#feature-workflow-mastery)
12. [Documentation](#documentation)
13. [Questions & Support](#questions--support)

---

## Architecture Rule

**Rust owns all business logic.** Every app under `apps/` is a dumb rendering shell that calls into Rust — via WASM on web, natively on desktop, via UniFFI on mobile. Logic is never duplicated between apps.

Before writing anything in an app, ask: **"Does this belong in `rust/`?"**

---

## Project Layout

| Directory | What it is |
|-----------|------------|
| `rust/core` | NLE engine: state management, autonomous editor, timeline logic |
| `rust/crates/state` | CRDT: LWW-Register, vector clocks, tombstones, operations |
| `rust/crates/compositor` | GPU compositor: 17 blend modes, wgpu rendering |
| `rust/crates/effects` | 11 GPU effect shaders (blur, color grade, chroma key, etc.) |
| `rust/crates/audio` | DSP: 10-band EQ, compressor, VST host, mixer |
| `rust/crates/export` | FFmpeg encoding pipeline (MP4, ProRes, DCP, AAF, MOV, GIF) |
| `rust/crates/neural_engine` | Face detection (SCRFD ONNX), clip tagging (EfficientNet) |
| `rust/crates/masks` | JFA signed distance field masking |
| `rust/crates/time` | `MediaTime`, `FrameRate`, `TimeCode` types |
| `rust/crates/bridge` | Inter-crate communication types |
| `rust/wasm` | WASM bridge — all crates → JavaScript (`wasm-pack`) |
| `rust/api-gateway` | Axum REST gateway (port 8005, JWT, Swagger) |
| `rust/cli` | Headless CLI renderer (Clap, all formats, batch mode) |
| `rust/mcp-server` | MCP protocol server (47 tools, 4 resources, 4 prompts) |
| `rust/p2p-sync` | libp2p mesh networking for peer-to-peer collaboration |
| `rust/provenance` | C2PA content authenticity and provenance tracking |
| `rust/temporal-versioning` | Timeline versioning and branching |
| `rust/plugin-api` | Third-party plugin SDK |
| `apps/web` | Next.js 16 (App Router) + React 19 + TailwindCSS (port 3000) |
| `apps/desktop` | GPUI (Zed framework) native desktop app + wgpu compositor |
| `apps/mobile` | React Native + Expo + UniFFI Rust bindings |
| `apps/browser-extension` | Chrome MV3 extension for video capture + import |
| `services/pre-processing` | Python FastAPI (port 8000): Whisper, SAM2, NeRF |
| `services/generative-studio` | Python FastAPI (port 8001): Kling 3.0, Edge TTS, F5-TTS, Demucs |
| `services/ai-agents` | Node.js Bun (port 8002): Chronos Copilot, LLM orchestration |
| `services/render-service` | Node.js Bun (port 8003): FFmpeg render farm, SSE progress |
| `services/collab-server` | Rust Axum (port 8004): CRDT sync + WebRTC signaling |
| `services/analytics-service` | Node.js Bun (port 8006): Event ingestion, Kafka |
| `services/social-publish` | Node.js Bun (port 8007): Multi-platform publishing |
| `infra/terraform/` | Azure infrastructure as code |
| `k8s/` | Kubernetes manifests (optional AKS) |
| `monitoring/` | Prometheus, Grafana, Loki, Tempo, Alertmanager |
| `scripts/` | Build, deploy, and automation scripts |
| `docs/` | Mastery documentation framework + user/developer guides |

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.96+ stable | All business logic (`rust-toolchain.toml`) |
| **Bun** | 1.3.14+ | Package manager, test runner, Node.js runtime |
| **Python** | 3.13+ | ML microservices |
| **Node.js** | 20+ | Required by Bun tooling |
| **Docker** | 24+ | Containerized local development |
| **FFmpeg** | 6+ | Render pipeline (bundled in Docker) |
| **PostgreSQL** | 16+ | Database (bundled in Docker) |

### Install & Run

```bash
# Clone and install
git clone https://github.com/lazynext/lazynext.git
cd lazynext
bun install

# Configure environment
cp .env.example .env.local
# Fill in required values (DATABASE_URL, BETTER_AUTH_SECRET)

# Build WASM (required for web dev)
./build-wasm.sh

# Start the web app
bun run dev                    # Next.js on port 3000

# Or start full platform via Docker
docker compose up --build -d    # All 9 services + observability (takes 2-4 min first run)

# Or bootstrap everything locally
./start-platform.sh
```

### Verify

```bash
./scripts/health-check.sh       # Check all services
./scripts/full-e2e.sh           # Full E2E pipeline test
open http://localhost:8005/swagger-ui
```

---

## Development Workflow

1. **Read the docs** in order:
   - `docs/mastery-compact.md` — Framework rules
   - `docs/project-discussion.md` — Project decisions
   - `docs/project-context.md` — Formal project context
   - `docs/project-roadmap.md` — Current state

2. **Check for active features**: Look for 🟡 IN PROGRESS in the roadmap, then open that feature's folder in `docs/features/`.

3. **Create a feature branch**: `git checkout -b feature/XX-feature-name` from `main`.

4. **Follow the Mastery workflow**: Discuss → Architecture → Tasks → Build → Changelog (see below).

5. **Run all checks locally** before pushing:
   ```bash
   cargo fmt --all --check
   cargo clippy --workspace --all-targets -- -D warnings
   cargo test --workspace
   bun run typecheck && bun run lint && bun run test
   ```

6. **Push and open a PR** against `main`. Branches are never deleted after merge.

---

## Code Style

### Rust

- **Formatting**: `cargo fmt` (rustfmt, default settings)
- **Linting**: `cargo clippy --workspace --all-targets -- -D warnings`
- **Naming**: `snake_case` for functions/variables, `CamelCase` for types, `SCREAMING_SNAKE_CASE` for constants
- **Error handling**: Use `thiserror` for library errors, `anyhow` for application code. Never `.unwrap()` in production paths — use `?` or explicit `match`
- **Logging**: Use `tracing` (`info!`, `warn!`, `error!`). Never `println!` or `eprintln!` in production code
- **Documentation**: All public items must have `///` doc comments with examples
- **Unsafe code**: Must be justified with a `// SAFETY:` comment, kept to minimum scope
- **Tests**: Every public function should have a unit test in `#[cfg(test)] mod tests`

### TypeScript / JavaScript

- **Formatting**: Biome — tabs, double quotes, 80 character line width
- **Linting**: ESLint — TypeScript strict, React hooks, accessibility
- **TypeScript**: Strict mode, no `any`, no enums, prefer `as const` and `import type`
- **React**: Use existing components from `apps/web/src/components/ui/` (shadcn/ui derivatives with glassmorphism styling). Read a component before using it — it may already apply classes
- **No `console.log`** in production code — use the structured logger
- **Package manager**: Always use `bun`. Never `npm` or `yarn`

### Python

- **Style**: PEP 8, 100 character line limit
- **Type hints**: Required on all function signatures
- **Linting/Formatting**: ruff (`ruff check .`, `ruff format`)
- **Imports**: Standard library → third-party → local. One import per line
- **Docstrings**: Google-style for all public functions

### General Rules

- No dead code — CI fails on unused variables/imports
- No commented-out code in committed files
- Environment variables documented in `.env.example`
- Services gracefully degrade to local processing when API keys are absent — never ship mock data

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `chore:` | Maintenance, deps, cleanup |
| `docs:` | Documentation only |
| `test:` | Tests only |
| `style:` | Formatting, linting (no logic changes) |
| `refactor:` | Code restructuring (no behavior change) |
| `perf:` | Performance improvements |
| `ci:` | CI/CD configuration changes |

**Format**: `<type>: <short description>`

Include `Co-Authored-By: Claude <noreply@anthropic.com>` for AI-assisted commits. Include any lint exceptions in the commit body with reasoning.

---

## Pull Request Process

### Before Opening a PR

1. All checks pass locally: format, lint, typecheck, tests
2. Tests added for new functionality
3. Documentation updated if public APIs changed
4. Breaking changes documented in PR description
5. Branch is rebased on latest `main`

### PR Description Template

```markdown
## Summary
<!-- One paragraph: what does this PR do? -->

## Motivation
<!-- Why is this needed? Link to issues. -->

## Changes
<!-- Bullet list of specific changes. -->

## Testing
<!-- How was this tested? What commands should reviewers run? -->

## Checklist
- [ ] cargo fmt + clippy pass
- [ ] TypeScript strict passes (no new `any`)
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Breaking changes documented
```

### Review

- At least one approving review from a maintainer required
- CI must be green (all checks passing)
- Address all review comments — fix or explain why not
- Maintainers may squash-merge or rebase-merge

---

## Testing Requirements

### Rust

```bash
cargo test --workspace              # Entire workspace
cargo test -p state                 # Specific crate
cargo test -p compositor
cargo test -p effects
RUST_LOG=debug cargo test -- --nocapture
cargo bench -p compositor           # Benchmarks
```

- Unit tests: `#[cfg(test)] mod tests { ... }` in the same file
- Integration tests: `tests/` at crate root
- CRDT operations **must** include convergence property tests

### Web App

```bash
bun run test                        # Unit tests
bun run test:e2e                    # Playwright E2E
bun test src/path/to/file.test.ts   # Specific file
```

### Python

```bash
cd services/pre-processing && pytest -v
cd services/generative-studio && pytest -v
```

### Node.js Services

```bash
cd services/ai-agents && bun test
cd services/render-service && bun test
```

### E2E Pipeline

```bash
./scripts/full-e2e.sh               # Full integration test
./scripts/smoke-test.sh             # API-level smoke test
./scripts/health-check.sh           # Service health
```

---

## Adding New Features

### Adding a New Crate

1. Create `rust/crates/<name>/` with `Cargo.toml` and `src/lib.rs`
2. Add to workspace members in root `Cargo.toml`
3. Wire into `rust/wasm/src/wasm.rs` if JS needs it
4. Add tests — unit + integration
5. Document public API with `///` doc comments

### Adding a New GPU Effect

1. Write the WGSL shader in `rust/crates/effects/src/shaders/`
2. Register in `rust/crates/effects/src/pipeline.rs` (shader module, pipeline, HashMap entry)
3. Add uniform packing in `pack_effect_uniforms()`
4. Expose via `rust/wasm/src/effects.rs`
5. Add effect definition in `apps/web/src/effects/definitions/`
6. Add a test rendering at least one frame with the effect

### Adding a New Microservice Endpoint

1. Add the FastAPI/Express route with proper input validation (Pydantic for Python, Zod for TS)
2. Follow the graceful-degradation pattern: check for API keys, fall back to local processing
3. Add at least one test in the service's `tests/` directory
4. Update the health check if the endpoint depends on external resources
5. Document the endpoint in `docs/api-reference.md`
6. Update `.env.example` if new environment variables are required

### Adding a New Service

1. Create `services/<name>/` with a Dockerfile and health check endpoint (`GET /health`)
2. Add to `docker-compose.yml` and `docker-compose.dev.yml`
3. Register in `start-platform.sh`
4. Add Terraform configuration in `infra/terraform/` for Azure deployment
5. Add any new environment variables to `.env.example`
6. Document in `docs/api-reference.md`

---

## CRDT Operations

All editor state mutations go through the CRDT operation log. When adding a new operation:

1. **Add the variant** to `CrdtOperation` in `rust/crates/state/src/operations.rs`
2. **Implement apply logic** in `rust/crates/state/src/crdt.rs`
3. **Wire it through** `rust/wasm/src/crdt_wasm.rs` so the JS layer can dispatch it
4. **Add an inverse** for undo in `rust/core/src/nle_state.rs`
5. **Add a convergence property test** — simulate two peers applying operations in different orders and assert convergence
6. **Update WebSocket sync** in `services/ai-agents/src/sync.ts` and `services/collab-server/src/main.rs`
7. **Add storage migration** if the operation changes the schema of saved project files

### CRDT Key Types

| Type | File | Purpose |
|------|------|---------|
| `LWWRegister<T>` | `state/src/crdt.rs` | Last-Writer-Wins Register |
| `OperationBasedCrdt` | `state/src/operations.rs` | Operation-based CRDT |
| `VectorClock` | `state/src/vector_clock.rs` | Causal ordering |
| `Tombstone` | `state/src/tombstone.rs` | Deletion markers |

---

## Feature Workflow (Mastery)

All features follow the 5-stage Mastery workflow. See `docs/mastery.md` for the full protocol.

1. **Discuss** — Create `docs/features/XX-name/discussion.md` with what, why, constraints, alternatives
2. **Architecture** — Create `docs/features/XX-name/architecture.md` with approach, data flow, file changes
3. **Tasks** — Create `docs/features/XX-name/tasks.md` with checkable task list
4. **Build** — Implement on a feature branch, `feat()` commits, keep CI green
5. **Changelog** — Log session notes in `docs/features/XX-name/changelog.md`

**Human approval required** for: merging to `main`, modifying architecture after finalization, changing `project-context.md`, reordering the roadmap, adding dependencies.

---

## Documentation

### Docs Index

| Document | Audience | Contents |
|----------|----------|----------|
| `docs/README.md` | Everyone | Docs index with links |
| `docs/api-reference.md` | Developers | All API endpoints with request/response |
| `docs/developer-guide.md` | Contributors | Architecture, crates, adding features, debugging |
| `docs/user-guide.md` | Users | Quick start, AI commands, shortcuts, FAQ |
| `docs/mcp-server-guide.md` | AI developers | MCP tools, resources, prompts, client setup |
| `docs/agent-sdk-guide.md` | AI developers | TypeScript/Python SDK quick start, streaming |
| `docs/mastery-compact.md` | AI agents | Framework rules (compact) |
| `docs/project-discussion.md` | Contributors | Project decisions and rationale |
| `docs/project-context.md` | Contributors | Formal project definition |
| `docs/project-roadmap.md` | Everyone | Feature status and progress |
| `docs/production-runbook.md` | Ops | Production incident response |
| `CONTRIBUTING.md` | Contributors | This file |

---

## Questions & Support

- **Bugs and feature requests**: Open a GitHub issue
- **Development chat**: `#lazynext-dev` Slack channel
- **Documentation**: Start with `docs/README.md` and this file
- **Community plugins**: `plugins/` directory
