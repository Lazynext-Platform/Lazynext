# Contributing to Lazynext

Welcome! Lazynext is an autonomous, real-time collaborative NLE built on Rust + WASM + TypeScript + Python. This guide will help you get oriented.

## Architecture Rule

**Rust owns all business logic.** Every app under `apps/` is a dumb rendering shell. Logic is never duplicated between apps. Before writing anything in an app, ask: "Does this belong in `rust/`?"

## Project Layout

| Directory | What it is |
|-----------|------------|
| `rust/core` | NLE engine: state management, autonomous editor, timeline logic |
| `rust/crates/` | Domain crates: state (CRDT), compositor, audio, effects, export, masks, etc. |
| `rust/wasm` | WASM bridge — all crates → JavaScript |
| `apps/web` | Next.js editor + API (port 3000) |
| `apps/desktop` | GPUI native desktop app |
| `apps/mobile` | React Native mobile app |
| `apps/browser-extension` | Chrome extension for video capture |
| `services/` | Backend microservices (ports 8000–8007) |
| `terraform/` | Azure infrastructure as code |
| `k8s/` | Kubernetes manifests |
| `monitoring/` | Prometheus, Grafana, Loki, Tempo |

## Getting Started

```bash
# Prerequisites: Rust 1.96+, Bun 1.3+, Python 3.13+
bun install
./build-wasm.sh
bun run dev         # Starts the web app on :3000
```

## Adding a New Crate

1. Create `rust/crates/<name>/` with `Cargo.toml` and `src/lib.rs`
2. Add it to the workspace in root `Cargo.toml`
3. Wire it into `rust/wasm/src/wasm.rs` if JS needs it
4. Add tests — `#[cfg(test)] mod tests { ... }`

## Adding a New Effect

1. Add the WGSL shader to `rust/crates/effects/src/shaders/`
2. Register it in `rust/crates/effects/src/pipeline.rs`
3. Expose via `rust/wasm/src/effects.rs`
4. Add the effect definition in `apps/web/src/effects/definitions/`
5. Add a test rendering at least one frame

## Adding a New Microservice Endpoint

1. Add the FastAPI/Express route with proper input validation
2. Follow the graceful-degradation pattern: check for API keys, fall back to dev mock
3. Add at least one test in the `tests/` directory
4. Update the health check if needed
5. Document the endpoint in the service's docstring

## Code Style

- **Rust**: `cargo fmt` + `cargo clippy -- -D warnings`
- **TypeScript**: Biome (tabs, double quotes, 80 char width) + ESLint strict
- **Python**: Follow PEP 8, type hints required on all function signatures
- **All**: No `console.log` / `println!` in production paths — use `tracing`

## Testing

```bash
cargo test --workspace          # Rust
bun run test                    # Web app
bun run test:e2e               # Playwright E2E
cd services/<name> && bun test  # Node services
cd services/<name> && pytest    # Python services
```

## CRDT Operations

All state mutations go through the CRDT operation log. When adding a new operation:

1. Add the variant to `CrdtOperation` in `rust/crates/state/src/operations.rs`
2. Implement the apply logic in `rust/crates/state/src/crdt.rs`
3. Wire it through `rust/wasm/src/crdt_wasm.rs`
4. Add an inverse for undo in `rust/core/src/nle_state.rs`
5. Add a convergence property test

## Commit Style

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, deps, cleanup
- `docs:` — documentation only
- `test:` — tests only

Include `Co-Authored-By: Claude <noreply@anthropic.com>` for AI-assisted commits.

## Questions?

Open an issue or ask in the `#lazynext-dev` Slack channel.
