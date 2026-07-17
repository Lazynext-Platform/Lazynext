# 💬 Discussion: Production Hardening — Web App

> **Feature**: `09` — Production Hardening — Web App
> **Status**: 🟡 IN PROGRESS
> **Branch**: `feature/09-production-hardening-web`
> **Depends On**: #01, #02, #03, #06
> **Date Started**: 2026-06-30
> **Date Completed**: —

---

## Summary

The web app (`apps/web`) is the primary delivery surface and the only format with substantial implementation (~85% shell, ~55% production-ready). However, it has critical gaps that prevent it from being a working video editor: real compositor rendering is not wired, CRDT sync is one-directional, the export pipeline is incomplete, the API gateway has hardcoded auth tokens, the database has dual ORM schemas, mock data is shipped in admin dashboards, and test coverage is ~5%. This feature hardens the web app to production-ready status by replacing all mocks/stubs with real implementations, consolidating the database layer, and adding comprehensive test coverage.

---

## Lessons from Previous Features

- **From #02 (Web App Shell)**: The command pattern delegates to WASM correctly — animation, mask, and command code in JS are UI orchestrators, not business logic duplication. This pattern must be preserved. The dual ORM (Kysely + Drizzle) was noted as a code smell but never resolved — must be consolidated here.
- **From #03 (API Gateway)**: Hardcoded auth tokens (`admin-token-123`, etc.) were identified in audit but never replaced. The API gateway integration test suite is entirely fake (`sleep + assert!(true)`). Both must be fixed.
- **From #06 (Infrastructure)**: The CI pipeline already runs rust fmt/clippy/test, TS typecheck/lint/test, and WASM build. Any new code must pass all CI checks before merge.

---

## Functional Requirements

- As an **editor**, I want to see real GPU-composited video frames in the preview canvas, not CPU canvas fallback
- As an **editor**, I want real-time collaboration where my edits sync bidirectionally via CRDT to other users
- As an **editor**, I want to export my timeline as a real video file (MP4/ProRes) with progress feedback
- As an **editor**, I want my project data persisted to PostgreSQL, not stored only in-memory or IndexedDB
- As a **developer**, I want a single ORM (Drizzle) with a consistent schema across the entire app
- As a **user**, I want all admin dashboards to show real data from the database, not mock data
- As an **operator**, I want the API gateway to use real JWT authentication, not hardcoded tokens

## Current State / Reference

### What Exists

The web app has 30+ pages, 45+ glassmorphism components, a fully-implemented canvas timeline (40 files, ~1900 LOC), 53 command files that delegate to WASM, 31 storage migrations, and a Fabric.js preview viewport. Server actions delegate to the Rust API Gateway at `http://127.0.0.1:8005`. Authentication uses better-auth with JWT.

### What Works Well

- Timeline editor: track management, element placement, snapping, zoom, drag-drop — fully functional
- Command pattern: 53 commands correctly delegate CRDT operations to WASM
- Migration system: 31 sequential versions with full test coverage
- UI components: consistent glassmorphism design system
- WASM integration: `lazynext-wasm` is imported and wired in multiple modules

### What Needs Improvement

All items identified in the deep audit (2026-06-30):

1. **Dual ORM Scheme (CRITICAL)**: Kysely (`src/lib/db/schema.ts`) and Drizzle (`src/db/schema.ts`) have different table structures. Better Auth uses Kysely; app data uses Drizzle. This must be consolidated to Drizzle-only.

2. **Mock Database Shipped (CRITICAL)**: `src/lib/mock-db.ts` serves hardcoded fake data to admin dashboards. Violates the "never ship mock data" rule.

3. **No GPU Renderer**: No `gpu-renderer.ts` exists. Preview uses CPU canvas only. Real compositor rendering (`rust/crates/compositor/`) must flow frames to the preview canvas.

4. **CRDT Sync One-Directional**: `syncTimelineFromEngine()` reads from WASM but the reverse path (React state → WASM engine) is incomplete. Collaboration only works as a relay, not true CRDT merge.

5. **Export Pipeline Incomplete**: Export endpoints delegate to WASM/FFMPEG but the pipeline (compositor frames → FFMPEG encoding → file output) is not wired end-to-end.

6. **API Gateway Has Hardcoded Auth**: Three literal tokens (`admin-token-123`, `editor-token-456`, `viewer-token-789`) in `rust/api-gateway/` instead of proper JWT validation.

7. **Hardcoded Server Actions**: Export, render, and chat APIs fall back to hardcoded defaults when the Rust Gateway is unreachable.

8. **Minimal Test Coverage**: 48 test files for 933 source files (~5%). 40% of tests are migration tests. Core editor, collaboration, preview, and media have almost no tests.

9. **API Gateway Fake Integration Tests**: 19 "integration tests" in `rust/api-gateway/tests/` are `sleep + assert!(true)` no-ops.

10. **Dodo Payments Webhook Not Verified**: `handle_dodo_webhook` prints event type without signature verification.

## Proposed Approach

This feature follows a **phase-gated approach**, starting with the highest-impact, lowest-risk fixes and progressing to deeper architectural changes:

1. **Phase A — Security & Auth Fixes**: Replace API gateway hardcoded tokens with real JWT validation, implement Dodo Payments webhook verification, fix hardcoded user ID. These are self-contained Rust changes that unblock all subsequent work.

2. **Phase B — Database Consolidation**: Migrate from dual ORM (Kysely + Drizzle) to single Drizzle schema. Update Better Auth adapter to use Drizzle. Remove Kysely dependency. This touches 2 schema files and the auth configuration.

3. **Phase C — Mock Data Removal**: Replace `mock-db.ts` with real database queries. Wire admin routes to actual PostgreSQL data. Ensure graceful degradation (empty states, not fake data) when data is unavailable.

4. **Phase D — Compositor & Preview Integration**: Wire `render_frame_to_texture()` from the Rust compositor into the web preview canvas. Replace CPU canvas fallback with GPU-rendered frames via WASM. Implement `gpu-renderer.ts`.

5. **Phase E — CRDT Bidirectional Sync**: Complete the React ↔ WASM sync loop. Wire `apply_crdt_operation` from UI commands to WASM engine. Verify convergence with property tests.

6. **Phase F — Export Pipeline**: Wire end-to-end compositor → FFMPEG → file output. Connect export UI to real render-service. Implement SSE progress streaming in the UI.

7. **Phase G — Testing**: Add unit tests for all new code. Replace fake API gateway integration tests with real ones. Add E2E tests for critical flows (auth → create project → edit → export).

8. **Phase H — Cleanup**: Remove legacy `lib/crdt.ts` stub. Remove dead `lazynext-wasm` dependencies in extensions. Fix hardcoded URLs (make configurable via env vars).

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Feature #01 — Rust Core Engine | Feature | ✅ Complete (retroactive) |
| Feature #02 — Web App Shell | Feature | ✅ Complete (retroactive) |
| Feature #03 — API Gateway | Feature | ✅ Complete (retroactive) |
| Feature #06 — Infrastructure & CI/CD | Feature | ✅ Complete (retroactive) |
| PostgreSQL | Infrastructure | ✅ Available |
| FFMPEG | External | ✅ Available (render-service) |

## Research & Prior Art

### Knowledge Gaps

- [x] Drizzle ORM adapter for Better Auth — Research: Better Auth supports Drizzle adapter natively
- [x] WebGPU canvas integration with WASM textures — Research: wgpu supports `HtmlCanvasElement` and `OffscreenCanvas` via the `gpu` crate
- [x] Bidirectional CRDT sync pattern — Research: Command pattern already exists; need to pipe `applyOperation` to WASM

### Key Findings

- The Rust compositor's `render_frame_to_texture()` is real (lines 317-372 in `compositor.rs`) — it produces valid wgpu textures. The gap is the WASM bridge to HTML canvas.
- The CRDT engine's `apply_operation()` has a TODO for full conflict resolution (line 720 in `nle_state.rs`) but basic operations work. Full convergence requires fixing that TODO and the temporal-versioning merge bug.
- Better Auth's Drizzle adapter is maintained and supports the same schema patterns as the Kysely adapter currently in use.

### Impact on Decisions

- Database consolidation is a known path — Drizzle adapter exists, just needs wiring
- GPU preview is feasible — `gpu` crate already provides `HtmlCanvasElement` and `OffscreenCanvas` adapters for WASM
- Export pipeline requires the render-service to receive real frames, not synthetic test patterns

## Open Questions

- [x] Should we consolidate to Drizzle or Kysely? → **Decision: Drizzle** — it's the primary ORM already used for app data, has better migration tooling, and Better Auth supports it
- [x] Should GPU preview use WebGPU or CPU canvas fallback? → **Decision: WebGPU with CPU fallback** — use WebGPU when available, fall back to CPU canvas for unsupported browsers
- [x] Should we fix the temporal-versioning merge bug in this feature? → **Decision: No** — that's a separate feature (Rust Core hardening). This feature focuses on the web app layer.
- [x] Should we add Playwright E2E tests now or defer? → **Decision: Add critical E2E tests now** — auth → create project → edit → export flow
- [x] Should export pipeline produce real files or delegate entirely to render-service? → **Decision: Delegate to render-service** — web app sends timeline state → render-service produces video → returns download URL

## Decisions Made

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-30 | Consolidate to Drizzle ORM | Primary ORM, Better Auth adapter exists, better migrations |
| 2026-06-30 | WebGPU with CPU fallback for preview | Maximum browser compatibility |
| 2026-06-30 | Fix API gateway auth first (Phase A) | Unblocks all subsequent work, self-contained |
| 2026-06-30 | Defer temporal-versioning fix | Separate Rust Core concern |
| 2026-06-30 | Add critical E2E tests in this feature | auth → create project → edit → export flow provides confidence |
| 2026-06-30 | Delegate export to render-service | Render-service already has FFMPEG orchestration; avoid duplicating |

## Discussion Complete ✅

**Summary**: Production harden the web app in 8 phases: auth fixes → DB consolidation → mock removal → compositor preview → CRDT sync → export pipeline → testing → cleanup. Start with self-contained Rust auth fixes, consolidate Kysely+Drizzle to Drizzle-only, remove mock-db.ts, wire GPU compositor frames to preview canvas, complete bidirectional CRDT sync, delegate export to render-service, add E2E tests for critical flows, and clean up legacy stubs. This is the critical path to a working web editor.

**Completed**: 2026-06-30
**Next**: Create architecture doc → `architecture.md`
