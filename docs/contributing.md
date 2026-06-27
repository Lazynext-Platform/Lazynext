# Contributing to Lazynext

Welcome! Lazynext is an autonomous, real-time collaborative NLE (Non-Linear Editor) built on Rust + WASM + TypeScript + Python. This guide supersedes the root `CONTRIBUTING.md` and covers everything you need to contribute effectively.

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
9. [Contributor License Agreement (CLA)](#contributor-license-agreement-cla)
10. [Adding New Features](#adding-new-features)
11. [CRDT Operations](#crdt-operations)
12. [Review Guidelines](#review-guidelines)
13. [Release Process](#release-process)
14. [Questions and Support](#questions-and-support)

---

## Architecture Rule

**Rust owns all business logic.** Every app under `apps/` is a dumb rendering shell that calls into Rust (via WASM on web, natively on desktop). Logic is never duplicated between apps.

Before writing anything in an app, ask: "Does this belong in `rust/`?"

---

## Project Layout

| Directory | What it is |
|-----------|------------|
| `rust/core` | NLE engine: state management, autonomous editor, timeline logic |
| `rust/crates/` | Domain crates: state (CRDT), compositor, audio, effects, export, masks, etc. |
| `rust/wasm` | WASM bridge — all crates bound to JavaScript (`lazynext-wasm`) |
| `rust/api-gateway` | Axum REST gateway on port 8005 |
| `rust/cli` | Headless CLI renderer |
| `rust/mcp-server` | MCP protocol server for AI agent integration |
| `rust/p2p-sync` | libp2p mesh networking for peer-to-peer collaboration |
| `rust/provenance` | Content provenance and authenticity tracking |
| `rust/temporal-versioning` | Timeline versioning and branching |
| `rust/plugin-api` | Third-party plugin SDK (`VideoEffect` trait, `WasmPluginRuntime`) |
| `apps/web` | Next.js 16 (App Router) + React 19 + TailwindCSS web app (port 3000) |
| `apps/desktop` | GPUI (Zed framework) native desktop app with wgpu rendering |
| `apps/mobile` | React Native mobile app with UniFFI native bindings |
| `apps/browser-extension` | Chrome extension for capturing video into the timeline |
| `services/pre-processing` | Python FastAPI on port 8000: Whisper transcription, SAM2 rotoscoping, NeRF extraction |
| `services/generative-studio` | Python FastAPI on port 8001: Stable Video Diffusion, ElevenLabs dubbing, Demucs stem separation |
| `services/ai-agents` | Node.js (Bun) on port 8002: Chronos Copilot LLM orchestration + CRDT WebSocket sync |
| `services/render-service` | Node.js (Bun) on port 8003: FFMPEG render farm with BullMQ + SSE progress streaming |
| `services/collab-server` | Rust (Axum) on port 8004: CRDT WebSocket sync + WebRTC signaling relay |
| `services/analytics-service` | Node.js (Bun) on port 8006: Kafka/ClickHouse telemetry pipeline |
| `terraform/` | Azure infrastructure as code |
| `k8s/` | Kubernetes manifests (optional, for AKS GPU workloads) |
| `monitoring/` | Prometheus, Grafana, Loki, Tempo configurations |
| `plugins/` | Example third-party plugins and SDK |

---

## Getting Started

### Prerequisites

- **Rust** 1.96+ (stable, managed via `rust-toolchain.toml`)
- **Bun** 1.3+ (package manager and Node runtime)
- **Python** 3.13+ (for microservices)
- **FFMPEG** (for render service)
- **PostgreSQL** (for API gateway)
- **Docker** (optional, for full platform)

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/lazynext/lazynext.git
cd lazynext
bun install

# Copy environment variables
cp .env.example .env.local
# Fill in required values (DATABASE_URL, BETTER_AUTH_SECRET, etc.)

# Build WASM (required before running the web app)
./build-wasm.sh

# Start the web app
bun run dev         # Next.js on :3000

# Or start the full platform via Docker
docker compose up --build -d

# Or bootstrap everything locally
./start-platform.sh
```

---

## Development Workflow

1. **Fork the repo** and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make changes** following the [Code Style](#code-style) guidelines below.

3. **Run all checks locally** before pushing:
   ```bash
   # Rust
   cargo fmt --all --check
   cargo clippy --workspace --all-targets -- -D warnings
   cargo test --workspace

   # Web app
   bun run typecheck
   bun run lint
   bun run test
   bun run test:e2e

   # Python services
   cd services/pre-processing && pytest
   cd services/generative-studio && pytest
   ```

4. **Push** and open a PR against `main`.

---

## Code Style

### Rust

- **Formatting**: `cargo fmt` (rustfmt, default settings)
- **Linting**: `cargo clippy --workspace --all-targets -- -D warnings`
- **Naming**: `snake_case` for functions/variables, `CamelCase` for types, `SCREAMING_SNAKE_CASE` for constants
- **Error handling**: Use `thiserror` for library errors, `anyhow` for application code. Never unwrap in production paths — use `?` or explicit `match`.
- **Logging**: Use `tracing` crate (`info!`, `warn!`, `error!`). Never `println!` or `eprintln!` in production code.
- **Documentation**: Document all public items with `///` doc comments. Include examples where appropriate.
- **Unsafe code**: Must be justified with a SAFETY comment and kept to the minimum scope.
- **Tests**: Every public function should have a unit test. Use `#[cfg(test)] mod tests { ... }`.

### TypeScript / JavaScript

- **Formatting**: Biome (`biome.json`) — tabs, double quotes, 80 character line width
- **Linting**: ESLint (`eslint.config.mjs`) — TypeScript strict, React hooks, accessibility rules
- **TypeScript**: Strict mode, no `any`, no enums, prefer `as const` and `import type` / `export type`
- **React**: Use existing components from `apps/web/src/components/ui/` (shadcn/ui derivatives with glassmorphism styling). Read a component before using it — it may already apply classes you need.
- **No `console.log`** in production code. Use the structured logger from `apps/web/src/lib/logger.ts`.
- **Package manager**: Always use `bun`. Never `npm` or `yarn` commands.
- **Accessibility**: Full a11y — semantic elements, ARIA roles, keyboard handlers, alt text on all images.

### Python

- **Style**: PEP 8, 100 character line limit
- **Type hints**: Required on all function signatures (`def foo(x: int) -> str:`)
- **Linting**: ruff (`ruff check .`)
- **Formatting**: ruff format
- **Imports**: Standard library first, then third-party, then local. One import per line.
- **Docstrings**: Google-style docstrings for all public functions.

### General Rules

- No dead code. CI fails if `cargo clippy` or ESLint detects unused variables/imports.
- No commented-out code in committed files.
- Environment variables are documented in `.env.example`. New ones must be added there.
- Services gracefully degrade to local processing when API keys are absent — never ship mock data in production.

---

## Commit Conventions

We follow a subset of [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `chore:` | Maintenance, dependency updates, cleanup |
| `docs:` | Documentation only |
| `test:` | Tests only |
| `style:` | Formatting, linting fixes (no logic changes) |
| `refactor:` | Code restructuring (no behavior change) |
| `perf:` | Performance improvements |
| `ci:` | CI/CD configuration changes |

### Format

```
<type>: <short description>

<optional body — what and why, not how>

<optional footer — breaking changes, issue references>
```

### Examples

```
feat: add gaussian blur GPU effect with configurable sigma

Implements a separable gaussian blur in two passes for O(w) performance
per dimension. Supports sigma from 0.5 to 50.0.

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
fix: resolve CRDT tombstone collision on concurrent clip deletion

When two peers delete the same clip within the same clock tick,
the second tombstone incorrectly overwrote the first. Now we
merge tombstone intervals.

Closes #1427
Co-Authored-By: Claude <noreply@anthropic.com>
```

### AI-Assisted Commits

When Claude Code or other AI tools assist with a commit, include:
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Pull Request Process

### Before Opening a PR

1. **All checks pass locally**: format, lint, typecheck, tests.
2. **Tests added** for new functionality.
3. **Documentation updated** if public APIs changed.
4. **Breaking changes documented** in the PR description.
5. **Branch is rebased** on the latest `main`.

### PR Description Template

```markdown
## Summary
<!-- What does this PR do? One paragraph. -->

## Motivation
<!-- Why is this change needed? Link to issues. -->

## Changes
<!-- Bullet list of specific changes. -->

## Testing
<!-- How was this tested? What commands should reviewers run? -->

## Screenshots (if UI change)
<!-- Before/after screenshots or screen recordings. -->

## Checklist
- [ ] cargo fmt + clippy pass
- [ ] TypeScript strict passes (no new `any`)
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Breaking changes documented
```

### Review

- At least **one approving review** from a maintainer is required.
- CI must be green (all checks passing).
- Address all review comments — either fix or explain why not.
- Maintainers may squash-merge or rebase-merge at their discretion.

### CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR:

1. **Rust**: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace`
2. **Web**: `bun run typecheck`, `bun run lint`, `bun test`, Playwright E2E tests
3. **Python**: ruff check, pytest for pre-processing and generative-studio services
4. **Build**: WASM build verification (`./build-wasm.sh`)

---

## Testing Requirements

### General Rules

- Every new feature must include tests.
- Every bug fix must include a regression test.
- Do not lower overall test coverage.
- Tests must be deterministic (no `sleep`-based timing, use mocks for external APIs).

### Rust Testing

```bash
# Test entire workspace
cargo test --workspace

# Test a specific crate
cargo test -p state
cargo test -p effects

# Run with logging
RUST_LOG=debug cargo test -- --nocapture
```

- Unit tests go in the same file as the code: `#[cfg(test)] mod tests { ... }`
- Integration tests go in `tests/` at the crate root
- CRDT operations must include **convergence property tests** (two concurrent mutations produce the same result regardless of order)
- GPU tests should run on CI with a software renderer or be gated behind `#[cfg_attr(not(feature = "gpu"), ignore)]`

### Web App Testing

```bash
# Unit tests (Bun)
bun run test

# E2E tests (Playwright)
bun run test:e2e

# Run specific test file
bun test src/components/editor/timeline/timeline.test.ts
```

- Component tests in `__tests__/` directories or `.test.ts` co-located with source
- E2E tests in `apps/web/e2e/`
- Mock WASM imports in tests when testing components that call into Rust

### Python Testing

```bash
cd services/pre-processing && pytest -v
cd services/generative-studio && pytest -v
```

- Tests in `tests/` directory within each service
- Use `pytest` fixtures for shared setup
- Mock external API calls (OpenAI, Replicate, ElevenLabs) in unit tests

### Node.js Service Testing

```bash
cd services/ai-agents && bun test
cd services/render-service && bun test
```

### Performance Testing

For performance-sensitive changes (render pipeline, CRDT sync, effects), include benchmarks:

```bash
# Rust benchmarks
cargo bench -p compositor

# JavaScript benchmarks
bun run bench
```

---

## Contributor License Agreement (CLA)

By contributing to Lazynext, you agree that:

1. **Your contributions are licensed** under the project's license (MIT, see `LICENSE`).
2. **You have the right** to submit the contribution. You created it yourself, or you have permission from your employer, or it is open source under a compatible license.
3. **You grant a perpetual, worldwide, non-exclusive, royalty-free license** to use, reproduce, modify, and distribute your contributions as part of Lazynext.

For significant contributions (>100 lines of code or new features), maintainers may ask you to explicitly acknowledge the CLA in your PR description.

Third-party dependency additions require license compatibility review. All dependencies must use MIT, Apache 2.0, BSD, or similarly permissive licenses. GPL dependencies are not allowed in the core project.

---

## Adding New Features

### Adding a New Crate

1. Create `rust/crates/<name>/` with `Cargo.toml` and `src/lib.rs`
2. Add it to the workspace members in root `Cargo.toml`
3. Wire it into `rust/wasm/src/wasm.rs` if JavaScript needs to call it
4. Add tests — both unit and integration
5. Document public API with `///` doc comments
6. Update the crate table in `CLAUDE.md`

### Adding a New Effect

1. Write the WGSL shader and place it in `rust/crates/effects/src/shaders/`
2. Register it in `rust/crates/effects/src/pipeline.rs` (shader module, render pipeline, HashMap entry)
3. Add uniform packing logic in `pack_effect_uniforms()`
4. Expose via `rust/wasm/src/effects.rs`
5. Add the effect definition (parameters, defaults, translations) in `apps/web/src/effects/definitions/`
6. Add a test that renders at least one frame with the effect applied

### Adding a New Microservice Endpoint

1. Add the FastAPI/Express route with proper input validation (Pydantic models for Python, Zod or io-ts for TypeScript)
2. Follow the graceful-degradation pattern: check for API keys at runtime, fall back to local processing
3. Add at least one test in the service's `tests/` directory
4. Update the service's health check if the new endpoint depends on external resources
5. Document the endpoint in the service's docstring
6. Update `docs/api-reference.md` with request/response examples

### Adding a New Service

1. Create `services/<name>/` with a Dockerfile
2. Add it to `docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.gpu.yml` as appropriate
3. Add health check endpoint (`GET /health` returning JSON with `status: "ok"`)
4. Register in `start-platform.sh`
5. Add Terraform configuration in `terraform/azure/` for Azure Container Apps deployment
6. Update `.env.example` with any new environment variables
7. Document in `CLAUDE.md` services table and `docs/api-reference.md`

---

## CRDT Operations

All editor state mutations go through the CRDT operation log. When adding a new operation:

1. **Add the variant** to `CrdtOperation` in `rust/crates/state/src/operations.rs`
2. **Implement apply logic** in `rust/crates/state/src/crdt.rs`
3. **Wire it through** `rust/wasm/src/crdt_wasm.rs` so the JS layer can dispatch it
4. **Add an inverse** for undo in `rust/core/src/nle_state.rs`
5. **Add a convergence property test** — simulate two peers applying operations in different orders and assert they converge to the same state
6. **Update the WebSocket sync** in `services/ai-agents/src/sync.ts` and `services/collab-server/src/main.rs` if the operation has new fields
7. **Add a storage migration** if the operation changes the schema of saved project files (see `apps/web/src/services/storage/migrations/`)

### CRDT Key Types

| Type | File | Purpose |
|------|------|---------|
| `LWWRegister<T>` | `rust/crates/state/src/crdt.rs` | Last-Writer-Wins Register — single value, latest timestamp wins |
| `OperationBasedCrdt` | `rust/crates/state/src/operations.rs` | Operation-based CRDT — commutative operations that converge |
| `VectorClock` | `rust/crates/state/src/vector_clock.rs` | Causal ordering vector for partial order comparison |
| `Tombstone` | `rust/crates/state/src/tombstone.rs` | Deletion markers that propagate and eventually garbage-collect |

---

## Review Guidelines

### For Contributors

- Keep PRs focused — one feature or fix per PR. Split large changes into stacked PRs.
- Explain the "why" in your PR description, not the "what" (the diff shows the what).
- Respond to all review comments, even if just "Done" or "Won't fix because...".
- Re-request review after addressing comments.

### For Reviewers

- **Correctness**: Does the logic handle edge cases? Are error paths covered?
- **Performance**: Does this allocate unnecessarily? Is there a hot loop that could be optimized?
- **Security**: Are inputs validated? Are secrets exposed? Is auth checked?
- **Testing**: Do tests cover the happy path and at least one error path?
- **Style**: Does it follow the project conventions? Is the code self-documenting?
- **Architecture**: Does business logic live in the right layer (Rust for core logic, app shells for UI only)?

---

## Release Process

Lazynext uses continuous deployment from `main`:

1. PRs are merged into `main` after review and green CI
2. The `production.yml` workflow triggers on push to `main`
3. Docker images are built and pushed to `ghcr.io/lazynext/*`
4. Azure Container Apps are updated via `az containerapp update`
5. Database migrations run as part of the deployment

### Hotfixes

For critical production issues:

1. Create a branch from the latest release tag: `git checkout -b hotfix/... v1.2.3`
2. Fix, test, and open a PR against `main`
3. After merge, the production pipeline deploys automatically

---

## Questions and Support

- **Bugs and feature requests**: Open a GitHub issue with the appropriate template
- **Development chat**: `#lazynext-dev` Slack channel
- **Documentation**: Start with `CLAUDE.md` and the files in `docs/`
- **Community plugins**: `plugins/` directory and `docs/plugin-guide.md`
