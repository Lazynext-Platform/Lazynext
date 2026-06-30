# AGENTS.md

Lazynext is an enterprise-grade, multi-platform AI-native Non-Linear Video Editor (NLE). Rust owns all business logic; every app is a dumb rendering shell. The Chronos AI Copilot translates natural language into CRDT timeline operations.

## Project Structure

```
lazynext/
├── apps/                    # UI Shells (Next.js, GPUI, React Native, Chrome MV3)
├── rust/                    # ALL business logic — single source of truth
│   ├── core/                # NLE engine
│   ├── crates/state/        # CRDTs, keyframes, vector clocks, tombstones
│   ├── crates/compositor/   # GPU compositor (17 blend modes)
│   ├── crates/audio/        # DSP: EQ, compressor, VST host
│   ├── crates/effects/      # 11 GPU effect shaders
│   ├── crates/export/       # FFMPEG encoding pipeline
│   ├── wasm/                # WASM bridge (all crates → JS)
│   └── api-gateway/         # Axum REST gateway
├── services/                # Microservices (Python FastAPI, Node.js Bun)
├── packages/                # Shared packages
├── terraform/               # Azure infrastructure as code
└── docs/                    # Mastery documentation framework
```

## Getting Started (for AI Agents)

Read docs in this exact order (matches the AI Agent Protocol in `docs/mastery.md`):

1. `docs/mastery-compact.md` — Framework rules (compact — all rules, no templates)
2. `docs/project-discussion.md` — Understand WHY the project exists and key decisions
3. `docs/project-context.md` — Understand WHAT the project is (formalized)
4. `docs/project-roadmap.md` — Understand WHERE the project stands
5. `docs/features/` (active) — Understand the current feature state

> Need a document template? Load it from the full `docs/mastery.md` — search for the specific template heading.

To find current work:
1. Check `docs/project-roadmap.md` for features marked 🟡 IN PROGRESS
2. Open that feature's folder: `discussion → architecture → tasks → changelog`
3. In `tasks.md`, find the last checked checkbox — that's where work stopped
4. In `changelog.md`, read the latest Session Note for context

## Key Rules

- **Docs before code** — discuss, design, and plan before building. Never skip stages.
- **Rust owns all business logic** — never put logic in `apps/` or `services/` that belongs in `rust/`.
- **Feature branches only** — all work happens on `feature/XX-name` branches, never on `main`.
- **Never delete branches** — kept forever as historical reference.
- **Human approval required** for: merging to main, modifying architecture after finalization, changing `project-context.md`, reordering the roadmap, adding dependencies.
- **AI agents CAN** autonomously: read docs, write code within active tasks, check off tasks, log changelog entries, create commits, push to feature branches.

See the full Autonomy Boundaries table in `docs/mastery.md` → AI Agent Protocol section.

## Conventions

**Branches**: `feature/XX-feature-name` from `main` (e.g., `feature/01-core-engine`)

**Commits**: `type(scope): short description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `hotfix`
- Scope: feature name or module (e.g., `compositor`, `state`, `web`)

**File naming**: kebab-case for all files (e.g., `project-context.md`)

**Markdown style**: ATX headings (`#`), fenced code blocks (triple backtick)

**Monorepo rules**:
- Package manager: Bun (never npm/yarn)
- Formatting (TS): Biome (tabs, double quotes, 80 char)
- Formatting (Rust): cargo fmt
- Linting (TS): ESLint with TypeScript strict
- Linting (Rust): cargo clippy -- -D warnings
- Never put business logic in `apps/` — it goes in `rust/`
- Read components before using them — they may already apply classes

**Graceful degradation**: AI features fall back to local processing when API keys are absent — never ship mock data.

## Full Protocol

The complete AI Agent Protocol — including context loading order, autonomy boundaries, session handoff protocol, and communication style rules — is defined in:

**`docs/mastery.md` → Section: 🤖 AI Agent Protocol**
