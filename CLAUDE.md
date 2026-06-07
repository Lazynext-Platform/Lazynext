# Lazynext 2030 — AI-Powered NLE Platform

## Quick Start
```bash
# PostgreSQL (Homebrew, port 5433)
brew services start postgresql@18
# DATABASE_URL in apps/web/.env.local

# Run dev server
cd apps/web && bun dev
# → http://localhost:3000

# Run tests (bun)
cd apps/web && bun test
```

## Current State (2026-06-07)

| Metric | Status |
|---|---|
| TypeScript errors | **0** (2,200+ resolved) |
| Unit tests | **171 new** (401 total, 6 pre-existing failures) |
| `ignoreBuildErrors` | `true` (Turbopack: pages 500, API routes + static work) |
| EditorClient | 7,099 lines (-1,651) |
| Extracted components | **7** (BezierEditor, RenderFarm, NeuralCinema, SentientColor, VideoScopes, +2 prior) |
| Database | PostgreSQL 18, 9 Drizzle tables |

## Architecture
- **Frontend**: Next.js 16 (Turbopack), React 19, Tailwind 4, Zustand, Drizzle ORM
- **Rust/WASM**: wgpu compositor → wasm-pack → `lazynext-wasm`
- **Auth**: Better Auth (anonymous + OAuth)
- **Storage**: IndexedDB/OPFS local-first, 31 migration versions
- **AI Agent**: Multi-model (Anthropic/OpenAI/Gemini/Ollama), 8 tool schemas

## Key Files
- `apps/web/src/components/editor/EditorClient.tsx` — main editor UI (7,297 lines)
- `apps/web/src/components/editor/useEditorState.tsx` — EditorStateProvider context (9 state vars migrated)
- `apps/web/src/core/managers/commands.ts` — CommandManager (undo/redo, 21 tests)
- `apps/web/src/animation/` — keyframe system (38 tests)
- `apps/web/src/params/` — parameter definitions (24 tests)
- `rust/crates/compositor/src/compositor.rs` — GPU compositor
- `rust/crates/agent/src/lib.rs` — Multi-model AI agent

## Test Files (7 files, 126 new tests)
- `core/managers/__tests__/commands.test.ts` (21 tests)
- `core/managers/__tests__/selection-manager.test.ts` (21 tests)
- `params/__tests__/params.test.ts` (24 tests)
- `animation/__tests__/interpolation.test.ts` (20 tests)
- `animation/__tests__/channel-data.test.ts` (18 tests)
- `animation/__tests__/keyframe-query.test.ts` (13 tests)
- `animation/__tests__/bezier.test.ts` (9 tests)

## Database
```
DATABASE_URL="postgresql://lazynext:lazynext@localhost:5433/lazynext"
```
Tables: users, sessions, accounts, projects, clips, timelines, tracks, feedback, verifications

## Commands
```bash
bun test                    # Run all 83 tests
npx tsc --noEmit            # TypeScript check (0 errors)
npx drizzle-kit push        # Push schema to database
```
