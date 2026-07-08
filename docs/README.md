# Lazynext Documentation

Welcome to the Lazynext documentation. Lazynext is an enterprise-grade, multi-platform AI-native Non-Linear Video Editor (NLE).

**Quick links**: [User Guide](user-guide.md) · [API Reference](api-reference.md) · [Developer Guide](developer-guide.md) · [MCP Server](mcp-server-guide.md) · [Agent SDK](agent-sdk-guide.md)

> **Documentation site**: This folder is also an [mdBook](https://rust-lang.github.io/mdBook/). Run `mdbook serve docs` (from the repo root) to browse it locally at `http://localhost:3000`, or `mdbook build docs` to render static HTML into `docs/book/`. The site is auto-built and deployed to GitHub Pages on every push to `main` via `.github/workflows/docs-site.yml`. Navigation is defined in [`SUMMARY.md`](SUMMARY.md).
>
> The Rust API reference (rustdoc) is generated separately with `cargo doc --workspace --no-deps --open`.

---

## For Users

| Document | Description |
|----------|-------------|
| [**User Guide**](user-guide.md) | Quick start, AI Copilot commands, timeline basics, export formats, collaboration, keyboard shortcuts, FAQ |
| [**Project Roadmap**](project-roadmap.md) | Current feature status and progress (36/36 complete) |

---

## For Developers

| Document | Description |
|----------|-------------|
| [**API Reference**](api-reference.md) | All API Gateway and microservice endpoints with request/response examples, authentication, rate limiting, error codes |
| [**Developer Guide**](developer-guide.md) | Getting started, architecture overview, Rust crate guide, adding features, WASM bridge development, testing, debugging |
| [**MCP Server Guide**](mcp-server-guide.md) | MCP protocol overview, 14 tools reference, 4 resources, 4 prompts, connecting Claude Desktop/Cursor/Zed, example workflows |
| [**Agent SDK Guide**](agent-sdk-guide.md) | TypeScript and Python SDK quick start, streaming queries, search and slash commands, memory and rules, example use cases |
| [**CONTRIBUTING.md**](../CONTRIBUTING.md) | Contribution guidelines, code style, commit conventions, PR process, testing requirements |

### Architecture Deep-Dives

| Document | Description |
|----------|-------------|
| [**CRDT Collaboration Model**](references/architecture-crdt.md) | LWW registers, vector clocks, tombstones, operation log, convergence guarantees, sync flow |
| [**GPU Compositor Pipeline**](references/architecture-compositor.md) | FrameDescriptor, render pipeline, blend modes, effects, masks, color management, surface targets |
| [**System Data Flow**](references/architecture-data-flow.md) | Cross-process map: interactive edits, collaboration, AI copilot, pre-processing, export, persistence |

---

## Mastery Framework

The Mastery framework provides structured decision-making for all feature work.

| Document | Description |
|----------|-------------|
| [**Mastery Compact**](mastery-compact.md) | Framework rules (compact — all rules, no templates) |
| [**Mastery (Full)**](mastery.md) | Complete protocol with templates for every stage |
| [**Project Discussion**](project-discussion.md) | Project decisions, rationale, and key discussions |
| [**Project Context**](project-context.md) | Formal project definition: stack, architecture, conventions, scope |
| [**Project Roadmap**](project-roadmap.md) | Feature status and progress tracking |
| [**Project Changelog**](project-changelog.md) | High-level project changelog |
| [**Project Motto**](project-motto.md) | Core principles and project motto |

---

## Feature Documentation

Active & completed features are documented under `docs/features/`:

| Feature | Description |
|---------|-------------|
| [#01 — Rust Core Engine](features/01-rust-core-engine/summary.md) | CRDT state, GPU compositor, effects, audio, export |
| [#02 — Web App Shell](features/02-web-app-shell/summary.md) | Next.js editor, timeline, canvas, auth, storage |
| [#03 — API Gateway](features/03-api-gateway/summary.md) | Axum REST server, JWT, Swagger, rate limiting |
| [#04 — CLI Renderer](features/04-cli-renderer/summary.md) | Headless CLI, all formats, batch mode |
| [#05 — MCP Server](features/05-mcp-server/summary.md) | MCP protocol server, 47 tools, 4 resources, 4 prompts |
| [#07 — Desktop App](features/07-desktop-app/summary.md) | GPUI native desktop, wgpu compositor |
| [#08 — Mobile App](features/08-mobile-app/summary.md) | React Native, UniFFI, NativeBridge |
| [#18 — AI-Driven Editing](features/18-ai-driven-editing/architecture.md) | Lazynext AI Agent Copilot, NL → CRDT pipeline |
| [#22 — Real Export Pipeline](features/22-real-export-pipeline/architecture.md) | GPU compositor → FFmpeg WYSIWYG export |
| [#34 — Real Video Playback](features/34-real-video-playback-pipeline/architecture.md) | Video decode → GPU compositor → H.264 export |
| [#36 — E2E Launch Readiness](features/36-e2e-launch-readiness/architecture.md) | Final audit, 8 bug fixes, all 7 formats verified |

See `docs/features/` for the full list of 36 features.

---

## Operations

| Document | Description |
|----------|-------------|
| [**Production Runbook**](production-runbook.md) | Incident response, alerts, common procedures |

### Scripts

| Script | Description |
|--------|-------------|
| `scripts/demo.sh` | One-command E2E demo launcher |
| `scripts/health-check.sh` | Check health of all services |
| `scripts/smoke-test.sh` | API-level pipeline smoke test |
| `scripts/full-e2e.sh` | Full integration test (ingest→transcribe→edit→render) |
| `scripts/deploy.sh` | Master deployment orchestrator |
| `scripts/docker-build.sh` | Build and push all Docker images |

See `scripts/README.md` for the full scripts reference.

---

## Architecture at a Glance

```
Apps (dumb shells)          Rust (all business logic)        Microservices (async offload)
┌─────────────────┐         ┌─────────────────────────┐     ┌──────────────────────────────┐
│ Web (Next.js)    │──WASM──▶│ Core (NLEState, AI)      │     │ Pre-Processing (:8000)       │
│ Desktop (GPUI)   │──native─▶│ Crates (state, compositor,│───▶│ Generative Studio (:8001)    │
│ Mobile (RN)      │──UniFFI─▶│  effects, audio, export) │     │ AI Agents (:8002)            │
│ Extension (MV3)  │──REST──▶│ API Gateway (:8005)      │     │ Render Service (:8003)       │
└─────────────────┘         │ MCP Server (stdio)       │     │ Collab Server (:8004)        │
                             │ CLI (headless)           │     │ Analytics (:8006)            │
                             └─────────────────────────┘     │ Social Publish (:8007)       │
                                                              └──────────────────────────────┘
```

---

## Getting Help

- **User questions**: See the [User Guide](user-guide.md) FAQ section
- **API questions**: See the [API Reference](api-reference.md)
- **Development questions**: See the [Developer Guide](developer-guide.md) or open a GitHub issue
- **AI agent integration**: See the [MCP Server Guide](mcp-server-guide.md) and [Agent SDK Guide](agent-sdk-guide.md)
