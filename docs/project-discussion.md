# 💬 Project Discussion

> **Project**: Lazynext
> **Status**: 🟢 COMPLETE
> **Date Started**: 2025-01-01 (reconstructed 2026-06-30)
> **Date Completed**: 2026-07-01

---

## What Are We Building?

Lazynext is an enterprise-grade, multi-platform AI-native video editing ecosystem. It is a Non-Linear Editor (NLE) where an AI Copilot (Lazynext AI Agent) accepts natural language commands to edit video — replacing manual timeline manipulation with prompt-driven workflows. Every edit is a CRDT operation, every render is GPU-accelerated, and Rust owns all business logic across 7 delivery surfaces (web, desktop, mobile, browser extension, CLI, REST API, MCP server).

## Why Does This Project Exist?

Professional video editing is bottlenecked by complex UI and manual workflows. Existing tools (Premiere Pro, DaVinci Resolve, After Effects) require years to master. AI video tools (Runway, Descript, CapCut) are each siloed to a single niche. Lazynext unifies professional-grade NLE capabilities with AI-native control, real-time collaboration, and every platform surface — replacing an entire suite of tools with a single core engine.

## Target Users / Consumers

| User Type | Description | Primary Need |
|---|---|---|
| Professional Editors | Film/TV editors using NLEs daily | AI-assisted editing without losing professional control |
| Content Creators | YouTubers, TikTokers, social media creators | Fast, AI-driven viral content creation (captions, reframing, beat sync) |
| Development Teams | Teams building on the Lazynext platform | Plugin SDK, API gateway, MCP server for integration |
| AI Agents | MCP-compatible AI coding assistants | Programmatic timeline control via CRDT operations |

## Core Use Cases

- **Prompt-Driven Editing**: "Remove all my ums and uhs, add Hormozi captions, and duck the music by 15dB when I speak" → executed as CRDT operations
- **Real-Time Collaboration**: Multiple editors on the same timeline with CRDT-guaranteed convergence, WebRTC voice chat, and presence indicators
- **GPU-Accelerated Compositing**: 17 blend modes, 11 effect shaders, JFA signed distance field masking — all running on wgpu
- **AI Transcription & Editing**: Whisper-powered transcript with speaker diarization; edit video by editing text
- **Professional Export Pipeline**: MP4 (H.264/H.265), ProRes 422 HQ, DCP (SMPTE), AAF, MOV, GIF with SSE progress streaming
- **Cross-Platform Delivery**: Web (Next.js + WASM), Desktop (GPUI native), Mobile (React Native + UniFFI), Browser Extension (Chrome MV3), CLI (headless), REST API (Axum), MCP (stdio)

## Tech Stack Discussion

| Layer | Options Considered | Decision | Rationale |
|---|---|---|---|
| **Language** | Rust, C++, Go | Rust | Memory safety, zero-cost abstractions, WASM compilation target, strong crate ecosystem |
| **Web Framework** | Next.js, SvelteKit, Remix | Next.js 16 (App Router) | Industry standard, React 19 ecosystem, server components |
| **Desktop Framework** | Electron, Tauri, GPUI | GPUI (Zed framework) | Native performance, wgpu rendering, Rust-native — no JS bridge needed |
| **Mobile** | Flutter, Swift/Kotlin native | React Native + UniFFI | Code sharing with web, UniFFI for direct Rust bindings |
| **Database** | PostgreSQL, SQLite, MongoDB | PostgreSQL 16 | Relational integrity, Drizzle ORM support, Azure managed service |
| **State Management** | Redux, Zustand, CRDTs | CRDTs (LWW-Register + CmRDT) | Real-time collaboration requires conflict-free merging; CRDTs are the only correct choice |
| **GPU** | Metal/DirectX directly, Vulkan, wgpu | wgpu | Cross-platform (WebGPU, Vulkan, Metal, DX12) from single codebase |
| **AI Inference** | Self-hosted only, Cloud only | Pluggable (OpenAI, Anthropic, Gemini, Ollama) | Graceful degradation to local when API keys absent |
| **Testing** | Jest, Vitest, Bun test | Bun test + Playwright | Bun is the package manager; native test runner avoids tool duplication |
| **Build/Tooling** | npm, yarn, pnpm | Bun + Turbo | Speed, workspace support, WASM build integration |
| **Deployment** | AWS, GCP, Azure, Vercel | Azure Container Apps + Terraform | Enterprise contracts, GPU node pools, private VNet |

## Architecture Discussion

### Proposed Pattern

**Monorepo with strict layer separation**: Rust owns all business logic; each app is a dumb UI shell that calls into Rust (via WASM on web, natively on desktop, via UniFFI on mobile). Backend microservices handle AI inference, rendering, collaboration, and analytics as async offload tasks.

### Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Business logic location | `rust/` workspace exclusively | Single source of truth; never duplicated between apps |
| UI approach | Dumb shells in `apps/` | Each platform uses its optimal framework; Rust core is the brain |
| State synchronization | CRDTs (LWW-Register + operation-based) | Real-time multi-user editing without conflicts |
| Compositor | Custom GPU pipeline (wgpu) | Full control over blend modes, effects, and performance |
| Export encoding | FFMPEG with type-safe filter graph | Avoids stringly-typed FFMPEG errors; supports 6+ formats |
| AI orchestration | Lazynext AI Agent Copilot in `services/ai-agents` | LLM translates natural language → CRDT operations |
| Plugin system | VST3 host + custom shader SDK | Industry-standard audio plugins; extensible GPU effects |
| Content authenticity | C2PA specification (`rust/provenance`) | Cryptographic provenance for every edit |

## Project Structure Discussion

```
lazynext/
├── apps/                    # UI Shells (Next.js, GPUI, React Native, Chrome Extension)
├── rust/                    # Single source of truth — all business logic
│   ├── core/                # NLE engine
│   ├── crates/              # Domain crates (state, compositor, audio, effects, etc.)
│   ├── wasm/                # WASM bridge to JavaScript
│   ├── api-gateway/         # Axum REST gateway
│   ├── cli/                 # Headless CLI renderer
│   └── mcp-server/          # MCP protocol server
├── services/                # Backend microservices (Python, Node.js, Rust)
├── packages/                # Shared packages (api-client)
├── plugins/                 # Plugin SDK and examples
├── terraform/               # Infrastructure as Code
├── k8s/                     # Kubernetes manifests
├── monitoring/              # Prometheus, Grafana, Loki, Tempo
├── scripts/                 # Build and automation scripts
└── docs/                    # Mastery documentation
```

## Scope & Boundaries

### In Scope (v1.0 / MVP)

- Web app with full timeline editor, canvas preview, AI copilot
- CRDT-based real-time collaboration
- GPU compositor with 17 blend modes and 11 effect shaders
- Audio engine (EQ, compressor, VST host)
- Export pipeline (MP4, ProRes, DCP, AAF)
- AI transcription, filler removal, speaker diarization
- Plugin SDK (VST3, custom shaders)
- REST API Gateway with JWT auth
- Headless CLI renderer
- MCP server for AI agent integration
- Terraform-managed Azure infrastructure with CI/CD

### Out of Scope (v1.0 / MVP)

> **Note (2026-07-05):** This section reflects the original discussion held mid-project (Q1 2025). The project has since far exceeded MVP scope. Desktop and Mobile apps are **fully implemented** (Features #07, #08, #20, #21, #29). Kafka analytics and P2P mesh networking are **implemented** (Features #30, #31). See `project-context.md` for current scope.

- ~~Desktop app full implementation~~ → **Completed** (Features #07, #20)
- ~~Mobile app full implementation~~ → **Completed** (Features #08, #21, #29)
- 3D camera tracking and advanced VFX compositing
- Direct social media publishing APIs (TikTok, Instagram) — social-publish module exists in render-service but OAuth deferred
- ~~Real Kafka analytics pipeline~~ → **Completed** (Feature #30)
- ~~Real P2P mesh networking~~ → **Completed** (Feature #30)

### Known Constraints

- WASM bridge limits Rust-JS throughput for real-time preview at high resolutions
- wgpu maturity on mobile browsers is limited
- GPUI (Zed framework) is not a stable 1.0 dependency
- UniFFI bindings for mobile require per-platform native build pipelines
- All 36 features complete; platform is 100% code-complete. Remaining ~2% is operational (deployment, performance profiling, production hardening)

## Feature Brainstorm

| Feature Idea | Priority | Notes / Dependencies |
|---|---|---|
| Core NLE engine (CRDT state, timeline, compositor) | 🔴 Must Have | Foundation — everything depends on this |
| Web App editor UI | 🔴 Must Have | Primary delivery surface |
| AI Copilot (Lazynext AI Agent) | 🔴 Must Have | Key differentiator |
| Export pipeline (FFMPEG) | 🔴 Must Have | Without export, it's not a video editor |
| Real-time collaboration (CRDT sync) | 🔴 Must Have | Core architectural choice |
| REST API Gateway | 🔴 Must Have | Programmatic access + web app backend |
| Desktop App (GPUI) | 🔴 Must Have (completed) | Professional editors expect native performance |
| Mobile App | 🔴 Must Have (completed) | Review and quick edits on the go |
| Browser Extension | 🟡 Should Have | Content capture from anywhere |
| CLI Renderer | 🟡 Should Have | CI/CD integration, headless rendering |
| MCP Server | 🟡 Should Have | AI agent integration |
| Plugin SDK | 🟡 Should Have | Ecosystem growth |
| Content Provenance (C2PA) | 🟢 Nice to Have | Enterprise/News orgs need authenticity |
| P2P Mesh Networking | 🟢 Nice to Have | Offline-first collaboration |
| Analytics Pipeline | 🟢 Nice to Have | Business intelligence |

## Conventions & Standards Discussion

| Convention | Standard | Notes |
|---|---|---|
| **Code formatting (Rust)** | cargo fmt (rustfmt) | Default settings |
| **Code formatting (TS)** | Biome | Tabs, double quotes, 80 char width |
| **Code formatting (Python)** | ruff format | PEP 8, 100 char limit |
| **Linting (Rust)** | cargo clippy -- -D warnings | Deny warnings |
| **Linting (TS)** | ESLint with TypeScript strict | React hooks, a11y rules |
| **Linting (Python)** | ruff check | All rules enabled |
| **Naming (Rust)** | snake_case functions, CamelCase types | Standard Rust |
| **Naming (TS)** | camelCase, PascalCase components | Standard JS/TS |
| **File naming** | kebab-case | All files and directories |
| **Git workflow** | Feature branches from main | Never delete branches |
| **Commit messages** | Conventional Commits | feat:, fix:, chore:, docs:, etc. |
| **Package manager** | Bun (never npm/yarn) | Workspace support, speed |

## Research & Prior Art

### Sources Consulted

| Source | Type | Key Takeaway |
|---|---|---|
| Premiere Pro / DaVinci Resolve | Competitor | Professional NLEs are feature-rich but lack AI-native control and real-time collaboration |
| Descript | Competitor | Transcript-driven editing validated; but limited to simple cuts, not full NLE |
| Runway / usecardboard.com | Competitor | Generative AI for video is compelling; web-native delivery is viable |
| CRDT literature (Shapiro et al.) | Academic | LWW-Register + operation-based CRDTs provide correct convergence for collaborative editing |
| wgpu / WebGPU spec | Standard | Cross-platform GPU compute and rendering from Rust is production-ready |
| GPUI (Zed) | Framework | Native Rust GUI framework with wgpu rendering; proven in Zed editor |
| C2PA specification | Standard | Content authenticity standard backed by Adobe, Microsoft, BBC |

### Key Findings

- CRDTs are the only correct foundation for real-time collaborative editing — OT (Operational Transformation) has known edge cases
- wgpu provides a single GPU API that compiles to Vulkan, Metal, DX12, and WebGPU — eliminating per-platform graphics code
- AI-native editing is validated by Descript's success but no product combines it with professional NLE depth
- The plugin ecosystem (VST3, custom shaders) is critical for professional adoption

### Impact on Decisions

- Rust chosen as core language specifically for WASM compilation target and CRDT implementation safety
- GPUI chosen over Electron specifically to avoid JS bridge overhead for GPU compositing
- CRDTs chosen over OT after reviewing academic literature on convergence guarantees
- Azure chosen over AWS/GCP due to existing enterprise contracts and GPU node pool availability

## Open Questions

- [x] Should we use Electron or GPUI for desktop? → Decided: GPUI for native performance
- [x] Should mobile use Flutter or React Native? → Decided: React Native + UniFFI for code sharing
- [x] CRDTs or OT for collaboration? → Decided: CRDTs for correct convergence
- [x] Monorepo or multi-repo? → Decided: Monorepo with strict layer separation
- [x] What database? → Decided: PostgreSQL via Drizzle ORM
- [x] What deployment platform? → Decided: Azure Container Apps via Terraform

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2025-Q1 | Rust as core language | WASM compilation, memory safety, CRDT implementation |
| 2025-Q1 | Monorepo architecture | Single source of truth, shared types, unified CI/CD |
| 2025-Q1 | CRDTs for state management | Real-time collaboration requires conflict-free convergence |
| 2025-Q2 | wgpu for GPU compositor | Cross-platform from single codebase |
| 2025-Q2 | Next.js for web shell | Industry standard, React ecosystem, server components |
| 2025-Q3 | GPUI for desktop shell | Native performance, no JS bridge overhead |
| 2025-Q3 | Pluggable LLM providers | Graceful degradation to local when API keys absent |
| 2025-Q4 | C2PA for content provenance | Industry standard for content authenticity |
| 2026-Q1 | Azure Container Apps for deployment | Enterprise contracts, GPU node pools |

## Discussion Complete ✅

**Summary**: Lazynext is an AI-native multi-platform NLE with Rust at its core, CRDTs for collaboration, and GPU-accelerated compositing. It targets 7 delivery surfaces with a single business-logic source of truth. **The platform is code-complete (100%)** — all 36 features shipped, all 7 formats functional, zero production mocks. The architectural foundation (CRDTs, GPU compositor, type-safe FFMPEG pipeline) is solid and fully implemented. Remaining work is operational: deployment, performance profiling, and production hardening.

**Completed**: 2026-06-30
**Next Steps**:
1. Create `project-context.md` — formalize the project identity from this discussion
2. Create `project-roadmap.md` — order the features and assign sequence numbers
3. Catalog completed work as retroactive summary.md files
