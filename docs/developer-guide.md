# Lazynext Developer Guide

Complete onboarding and reference for developers contributing to the Lazynext platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Rust Crate Guide](#rust-crate-guide)
4. [Adding a New Feature](#adding-a-new-feature)
5. [WASM Bridge Development](#wasm-bridge-development)
6. [Testing Guide](#testing-guide)
7. [Debugging Tips](#debugging-tips)
8. [Common Tasks](#common-tasks)

---

## Getting Started

### Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| **Rust** | 1.96+ stable | All business logic. Set by `rust-toolchain.toml`. |
| **Bun** | 1.3.14+ | Package manager, test runner, Node.js runtime |
| **Python** | 3.13+ | ML microservices (Whisper, SAM2, Stable Diffusion) |
| **Node.js** | 20+ | Required by Bun for some tooling |
| **Docker** | 24+ | Containerized local development and deployment |
| **FFmpeg** | 6+ | Render pipeline (bundled in Docker, optional locally) |
| **PostgreSQL** | 16+ | Primary database (bundled in Docker) |

### Install

```bash
# Clone the repo
git clone https://github.com/lazynext/lazynext.git
cd lazynext

# Install all dependencies
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Build the WASM bridge (required for web dev)
./build-wasm.sh

# Set up the database
bun run db:generate
bun run db:migrate
```

### Quick Start Options

```bash
# Option 1: Web app only (fastest for UI work)
bun run dev                    # Next.js on port 3000

# Option 2: Full platform (Docker)
docker compose up --build -d   # All 9 services + observability

# Option 3: Full platform (local)
./start-platform.sh            # Mixed local + Docker
```

**Verify it works**:
```bash
# Check all services
./scripts/health-check.sh

# Run the full E2E test
./scripts/full-e2e.sh

# Open Swagger UI
open http://localhost:8005/swagger-ui
```

---

## Architecture Overview

### The Golden Rule

**Rust owns all business logic.** Every app under `apps/` is a dumb rendering shell that imports Rust — via WASM on web, natively on desktop, via UniFFI on mobile. Logic is never duplicated between apps.

### Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Apps (dumb shells)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Web      │ │ Desktop  │ │ Mobile   │ │ Extension │  │
│  │ Next.js  │ │ GPUI     │ │ RN+UniFFI│ │ Chrome MV3│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
├───────┼────────────┼────────────┼─────────────┼─────────┤
│  Rust │   WASM     │  native    │  UniFFI     │  HTTP   │
│       │   bridge   │  ffi       │  bindings   │  API    │
│  ┌────┴────────────┴────────────┴─────────────┴──────┐  │
│  │                    Rust Core                       │  │
│  │  NLEState → AutonomousEditor → CRDT Ops → Export  │  │
│  │  GPU Compositor → Effects → Audio DSP → FFmpeg    │  │
│  └─────────────────────┬─────────────────────────────┘  │
│                        │                                 │
│  ┌─────────────────────┴─────────────────────────────┐  │
│  │                 Microservices                      │  │
│  │  Pre-Processing │ Gen Studio │ AI Agents │ Render  │  │
│  │  (Whisper,SAM2) │ (Diffusion)│ (Lazynext AI Agent) │(FFmpeg) │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ PostgreSQL  │  │  Redis   │  │ Azure Blob       │   │
│  │ (CRDT+ORM)  │  │ (Cache)  │  │ (Media Storage)  │   │
│  └─────────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User (type/speak) → Lazynext AI Agent Copilot → LLM (Anthropic/OpenAI/Gemini/Ollama)
    → VideoIntent → AutonomousEditor → CRDT mutations
    → NLEState → GPU Compositor (wgpu) → Frame buffer
    → ExportPipeline (FFmpeg) → Final video file
```

### Port Map

| Port | Service | Language | Description |
|------|---------|----------|-------------|
| 3000 | Web App | TypeScript | Next.js 16 frontend + API routes |
| 3001 | Grafana | — | Observability dashboards |
| 8000 | Pre-Processing | Python | Whisper, SAM2, NeRF |
| 8001 | Generative Studio | Python | Kling 3.0, Edge TTS, CosyVoice 3, Demucs |
| 8002 | AI Agents | TypeScript | Lazynext AI Agent Copilot, LLM orchestration |
| 8003 | Render Service | TypeScript | FFmpeg render farm |
| 8004 | Collab Server | Rust | CRDT sync, WebRTC signaling |
| 8005 | API Gateway | Rust | Axum REST + Swagger UI |
| 8006 | Analytics Service | TypeScript | Event ingestion, Kafka |
| 8007 | Social Publish | TypeScript | Multi-platform publishing |
| 9090 | Prometheus | — | Metrics |
| 3100 | Loki | — | Logs |
| 3200 | Tempo | — | Traces |

---

## Rust Crate Guide

### `rust/core` — NLE Engine

The brain of Lazynext. Contains:

- **`nle_state.rs`**: The `NLEState` struct — canonical project state (tracks, clips, keyframes, effects). All mutations go through CRDT operations.
- **`autonomous.rs`**: The `AutonomousEditor` — interprets `VideoIntent` from the LLM and turns it into CRDT operations. Contains `process_intent_with_llm()`.
- **`timeline.rs`**: Timeline logic — trim, split, ripple delete, slip/slide editing.
- **`auto_editor.rs`**: Template for autonomous editing behaviors.

### `rust/crates/state` — CRDT State

**Key files**:

| File | Purpose |
|------|---------|
| `crdt.rs` | `LWWRegister<T>` — Last-Writer-Wins Register |
| `operations.rs` | `CrdtOperation` enum — all mutation variants |
| `vector_clock.rs` | Causal ordering for partial order comparison |
| `tombstone.rs` | Deletion markers with garbage collection |

### `rust/crates/compositor` — GPU Compositor

17 blend modes, layer compositing, color space conversion. Built on wgpu — runs on WebGPU, Vulkan, Metal, DX12 with one API.

```rust
use lazynext_compositor::{Compositor, BlendMode};

let mut compositor = Compositor::new(&gpu_ctx);
compositor.set_blend_mode(BlendMode::Screen);
compositor.composite_frame(&layers, &output_texture);
```

### `rust/crates/effects` — GPU Effect Shaders

11 WGSL shaders for real-time effects:

| Effect | Shader File | Parameters |
|--------|-------------|------------|
| Blur (Gaussian) | `blur.wgsl` | sigma, direction |
| Color Grade | `color_grade.wgsl` | lift, gamma, gain |
| Chroma Key | `chroma_key.wgsl` | key_color, threshold, spill_suppression |
| Sharpen | `sharpen.wgsl` | amount, radius |
| Vignette | `vignette.wgsl` | intensity, radius, feather |
| Noise | `noise.wgsl` | amount, seed |
| Glow | `glow.wgsl` | threshold, intensity, radius |
| Pixelate | `pixelate.wgsl` | block_size |
| Kaleidoscope | `kaleidoscope.wgsl` | segments, angle |
| Distortion | `distortion.wgsl` | strength, scale |
| LUT | `lut.wgsl` | 3D LUT texture |

### `rust/crates/audio` — Audio DSP

- 10-band parametric EQ
- Compressor with sidechain
- VST3 host (via `libloading`)
- Audio mixer with pan, gain, mute, solo

### `rust/crates/export` — FFmpeg Encoding

Type-safe FFmpeg filter graph builder. Formats: MP4, ProRes, DCP, AAF, MOV, GIF.

```rust
use lazynext_export::{ExportConfig, ExportFormat, Encoder};

let config = ExportConfig {
    format: ExportFormat::Mp4,
    codec: "h264".into(),
    width: 1920,
    height: 1080,
    fps: 24.0,
    bitrate_bps: 16_000_000,
    ..Default::default()
};
let mut encoder = Encoder::new(config);
encoder.encode_frames(frame_iterator)?;
encoder.finish("output.mp4")?;
```

### Other Crates

| Crate | Purpose |
|-------|---------|
| `neural_engine` | Face detection (SCRFD ONNX), clip tagging (EfficientNet) |
| `masks` | JFA signed distance field masking |
| `time` | `MediaTime`, `FrameRate`, `TimeCode` types |
| `bridge` | Inter-crate communication types |
| `ffmpeg_filter` | Type-safe FFmpeg filter graph |
| `decklink` | Blackmagic DeckLink I/O (desktop) |
| `editor_core` | Silence/scene detection algorithms |
| `plugin` | Plugin host runtime |
| `gpu` | wgpu context management and scopes |
| `rules` | Declarative editing rules engine |

### `rust/wasm` — WASM Bridge

Binds all crates to JavaScript via `wasm-pack`. Key files:

| File | Exposes |
|------|---------|
| `wasm.rs` | Core `WasmNLE` struct, initialize, `get_state` |
| `crdt_wasm.rs` | CRDT operation dispatch to JS |
| `effects.rs` | Effect parameter binding |
| `compositor_wasm.rs` | GPU compositor control |

### Other Rust Projects

| Project | Purpose |
|---------|---------|
| `rust/api-gateway` | Axum REST server (port 8005) |
| `rust/cli` | Headless CLI renderer (Clap) |
| `rust/mcp-server` | MCP protocol server (47 tools) |
| `rust/p2p-sync` | libp2p mesh networking |
| `rust/provenance` | C2PA content authenticity |
| `rust/temporal-versioning` | Timeline versioning/branching |
| `rust/plugin-api` | Third-party plugin SDK |

---

## Adding a New Feature

Lazynext follows the **Mastery workflow**: Discuss → Architecture → Tasks → Build → Changelog.

### Stage 1: Discuss

Create `docs/features/XX-feature-name/discussion.md`:

```markdown
# Discussion — Feature Name

## What
Brief description of what this feature does.

## Why
Why does this need to exist? Link to user need or gap.

## Constraints
- Technical constraints
- Time/resource constraints
- Dependency constraints

## Alternatives Considered
- Option A (chosen because...)
- Option B (rejected because...)

## Open Questions
- Q1?
- Q2?
```

### Stage 2: Architecture

Create `docs/features/XX-feature-name/architecture.md`:

```markdown
# Architecture — Feature Name
> Status: DRAFT

## Approach
How we'll implement this.

## Data Flow
Diagram or description of how data moves.

## Files to Create/Modify
- `rust/core/src/new_module.rs` — ...
- `rust/wasm/src/new_bindings.rs` — ...

## Dependencies
- Requires: #01 (Core Engine)
- Unblocks: #XX (next feature)
```

### Stage 3: Tasks

Create `docs/features/XX-feature-name/tasks.md`:

```markdown
# Tasks — Feature Name

## Phase 1: Core Implementation
- [ ] 1.1 Create new module skeleton
- [ ] 1.2 Implement core logic
- [ ] 1.3 Write unit tests
- [ ] 1.4 Wire into WASM bridge

## Phase 2: Integration
- [ ] 2.1 Add API gateway endpoint
- [ ] 2.2 Add web UI component
- [ ] 2.3 Write E2E tests
```

### Stage 4: Build

1. Create a feature branch: `git checkout -b feature/XX-feature-name`
2. Implement, following the task list
3. Run all checks locally:
   ```bash
   cargo fmt --all --check
   cargo clippy --workspace --all-targets -- -D warnings
   cargo test --workspace
   bun run typecheck && bun run lint && bun run test
   ```
4. Commit using conventional commits: `feat(scope): description`

### Stage 5: Changelog

Create `docs/features/XX-feature-name/changelog.md` with a session note:

```markdown
## Session Note — 2026-07-02
- **Who**: AI Agent (opencode)
- **Worked On**: Implemented X, Y, Z
- **Stopped At**: Task 3.2 in progress
- **Blockers**: None
- **Next Steps**: Finish 3.2, then move to Phase 4
```

---

## WASM Bridge Development

The WASM bridge (`rust/wasm/`) compiles all Rust crates to WebAssembly for the web app.

### Build

```bash
# Manual build
cd rust/wasm
wasm-pack build --target web --out-dir pkg

# Or use the script
./build-wasm.sh
```

### Adding a New Binding

1. **Rust side** — Add a function to the relevant file in `rust/wasm/src/`:
   ```rust
   #[wasm_bindgen]
   pub fn apply_custom_effect(nle: &mut WasmNLE, effect_data: &str) -> Result<(), JsValue> {
       let effect = serde_json::from_str(effect_data).map_err(|e| JsValue::from_str(&e.to_string()))?;
       nle.inner.apply_effect(effect).map_err(|e| JsValue::from_str(&e.to_string()))
   }
   ```

2. **JS side** — Import and call:
   ```typescript
   import { apply_custom_effect } from "@/wasm";

   const result = apply_custom_effect(nleRef, JSON.stringify(effectParams));
   ```

3. **Rebuild**: `./build-wasm.sh`

### Debugging WASM

- Use `console.log` wrapper in the WASM bridge for development (stripped in production)
- Chrome DevTools supports WASM source maps
- For complex issues, build with debug symbols: `wasm-pack build --dev`

### Performance Considerations

- The WASM bridge is the bottleneck for high-res real-time preview
- Minimize crossing the JS↔WASM boundary in hot loops
- Batch CRDT operations where possible
- Use `SharedArrayBuffer` for frame data when available

---

## Testing Guide

### Rust

```bash
# Full workspace
cargo test --workspace

# Specific crate
cargo test -p state
cargo test -p compositor
cargo test -p effects

# With output
RUST_LOG=debug cargo test -- --nocapture

# Benchmarks
cargo bench -p compositor
```

**Test locations**:
- Unit tests: `#[cfg(test)] mod tests { ... }` in the same file
- Integration tests: `tests/` directory at crate root
- CRDT tests **must** include convergence property tests

### TypeScript (Web App)

```bash
bun run test          # Unit tests
bun run test:e2e      # Playwright E2E
bun test path/to/file # Specific file
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
# Full integration test
./scripts/full-e2e.sh

# Smoke test (API-level)
./scripts/smoke-test.sh

# Health check
./scripts/health-check.sh
```

---

## Debugging Tips

### Service Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api-gateway
docker compose logs -f render-service
docker compose logs -f pre-processing
```

### Rust Backtraces

```bash
RUST_BACKTRACE=full cargo run -p lazynext_api_gateway
```

### OpenTelemetry Traces

All microservices emit OTLP traces to Tempo. View traces in Grafana:

1. Open `http://localhost:3001` (admin / admin)
2. Navigate to Explore → Tempo
3. Search by `service_name = api-gateway` or any trace ID

### Database

```bash
# Connect to dev PostgreSQL
docker compose exec db psql -U lazynext -d lazynext

# Useful queries
SELECT count(*) FROM projects;
SELECT * FROM crdt_operations WHERE project_id = 'proj_abc123' ORDER BY timestamp DESC LIMIT 20;
```

### Web App

- React DevTools for component inspection
- Next.js dev mode has full error overlays
- `NODE_OPTIONS='--inspect' bun run dev` for Node debugger

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| WASM init fails | Stale build | `./build-wasm.sh` |
| Auth 401 | Missing secret | Set `BETTER_AUTH_SECRET` in `.env.local` |
| DB connection refused | PostgreSQL not running | `docker compose up -d db` |
| Render 503 | GPU queue full | Check `docker compose logs render-service` |
| AI features return mock | Missing API keys | Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` |
| Port conflicts | Previous instance running | `docker compose down; lsof -ti:3000,8000-8007 \| xargs kill -9` |

---

## Common Tasks

### Add a New GPU Effect

1. Write WGSL shader in `rust/crates/effects/src/shaders/`
2. Register in `rust/crates/effects/src/pipeline.rs` (shader module, pipeline, HashMap)
3. Add uniform packing in `pack_effect_uniforms()`
4. Expose via `rust/wasm/src/effects.rs`
5. Add UI definition in `apps/web/src/effects/definitions/`
6. Add a test that renders one frame with the effect

### Add a New CRDT Operation

1. Add variant to `CrdtOperation` in `rust/crates/state/src/operations.rs`
2. Implement apply logic in `rust/crates/state/src/crdt.rs`
3. Wire through `rust/wasm/src/crdt_wasm.rs`
4. Add inverse for undo in `rust/core/src/nle_state.rs`
5. Add convergence property test
6. Update WebSocket sync in `services/ai-agents/src/sync.ts` and `services/collab-server/src/main.rs`
7. Add storage migration if schema changed

### Add a New Microservice Endpoint

1. Add the route with input validation (Pydantic for Python, Zod for TypeScript)
2. Follow graceful-degradation: check API keys, fall back to local processing
3. Add test in service's `tests/` directory
4. Update the health check if needed
5. Document in `docs/api-reference.md`

### Add a New Crate

1. Create `rust/crates/<name>/` with `Cargo.toml` and `src/lib.rs`
2. Add to workspace members in root `Cargo.toml`
3. If JS needs it, wire into `rust/wasm/src/wasm.rs`
4. Add tests
5. Document public API with `///` doc comments
