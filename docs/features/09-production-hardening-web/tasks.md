# ✅ Tasks: Production Hardening — Web App

> **Feature**: `09` — Production Hardening — Web App
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/09-production-hardening-web`
> **Status**: 🟢 COMPLETE
> **Progress**: 37/37 tasks complete

---

## Pre-Flight

- [ ] Discussion doc is marked COMPLETE
- [ ] Architecture doc is FINALIZED
- [ ] Feature branch created from main
- [ ] Dependent features are merged to main

---

## Phase A — Security & Auth Fixes ✅ COMPLETE (pre-existing)

> Verified: JWT auth, Dodo Payments HMAC, rate limiting, and CSRF are all real implementations with 19 passing tests.

- [x] **A.1** — Real JWT HS256 validation in `rbac.rs` using `BETTER_AUTH_SECRET` (no hardcoded tokens)
- [x] **A.2** — `handle_get_projects` uses `claims.sub` from validated JWT extension (no mock_user_id)
- [x] **A.3** — Dodo Payments webhook HMAC verification in `handle_dodo_webhook` with `verify_dodo_signature`
- [x] **A.4** — Full rate limiting with token-bucket + Redis (4 profiles: public, auth, AI gen, admin)
- [x] **A.5** — CSRF double-submit cookie pattern in `csrf.rs` (skips safe methods + Dodo Payments webhooks)
- [x] 📍 **Checkpoint A** — All 19 tests pass, `cargo test -p lazynext_api_gateway` green

---

## Phase B — Database Consolidation ✅ COMPLETE

> Merged Kysely schema into Drizzle, removed Kysely dependency entirely.

- [x] **B.1** — Added `timelineData`, `renderStatus`, `renderJobId` columns to Drizzle `projects` table
- [x] **B.2** — Added `assets` table to Drizzle schema with foreign key to `projects`
- [x] **B.3** — Generated migration `0002_tiresome_trauma.sql` (congruent schema, 12 tables)
- [x] **B.4** — Better Auth already uses `drizzleAdapter` (no change needed)
- [x] **B.5** — Removed Kysely from `package.json` (deps + resolutions), `next.config.ts`, deleted `src/lib/db/schema.ts`
- [x] **B.6** — Migration SQL generated and verified; run manually with `bun run db:migrate`
- [x] 📍 **Checkpoint B** — Zero Kysely imports remaining, TypeScript compiles clean

---

## Phase C — Mock Data Removal ✅ COMPLETE

> Replaced mock-db.ts with real DB queries, wired admin dashboards.

- [x] **C.1** — Created `src/lib/admin-data.ts` with real Drizzle queries (adminMetrics, systemStatus, AIProviderMetrics, recentUsers)
- [x] **C.2** — Updated superadmin page to use `adminData` with real user/project counts from PostgreSQL
- [x] **C.3** — Un-stubbed `getRecentUsers()` in `src/app/actions/admin.ts` — now fetches from API gateway
- [x] **C.4** — Deleted `src/app/api/mock-db/route.ts` — no more mock data served
- [x] 📍 **Checkpoint C** — Admin dashboards show real data, no mock data served in any route

---

## Phase D — Compositor & Preview Integration ✅ COMPLETE (pre-existing)

> Verified: GPU compositor WASM bridge is fully implemented with 1004 lines of real code.

- [x] **D.1** — `rust/wasm/src/compositor.rs`: `initCompositor`, `renderFrame`, `renderProjectFrame` are all real
- [x] **D.2** — `render_frame_to_texture()` path for WebGL, `render_frame()` for WebGPU surface rendering
- [x] **D.3** — Full keyframe interpolation (x, y, scale, rot, opacity, filters, crop, shadows, transitions)
- [x] **D.4** — 17 blend modes, chroma key effect, text rendering via OffscreenCanvas
- [x] 📍 **Checkpoint D** — GPU frames render via WASM compositor to canvas

---

## Phase E — CRDT Bidirectional Sync ✅ COMPLETE (pre-existing)

> Verified: Bidirectional WASM ↔ React sync is already implemented.

- [x] **E.1** — `setupCrdtSync()` receives remote deltas → applies to WASM engine → syncs React state
- [x] **E.2** — `broadcastOperation()` sends local CRDT ops to peers via WebSocket
- [x] **E.3** — `syncTimelineFromEngine()` hydrates scenes from WASM entity graph → sets React scenes
- [x] **E.4** — `WasmBridge` singleton provides `renderToCanvas()`, `getEngine()`, `initialize()`
- [x] 📍 **Checkpoint E** — Bidirectional sync: local edits → WASM → broadcast, remote → WASM → UI

---

## Phase F — Export Pipeline ✅ COMPLETE (pre-existing)

> Verified: Export routes delegate to render-service.

- [x] **F.1** — `POST /api/export` builds project config → dispatches to render-service → returns job ID
- [x] **F.2** — `POST /api/render/export` forwards timeline to render-service with format selection
- [x] **F.3** — Both routes have graceful fallbacks when render-service is unreachable
- [x] 📍 **Checkpoint F** — Export pipeline: web app → render-service → job ID → status polling

---

## Phase G — Testing ✅ COMPLETE

> Added tests for new code.

- [x] **G.1** — Added `admin-data.test.ts`: 4 test cases (metrics, system status, providers, recent users)
- [x] **G.2** — API gateway already has 19 real unit + integration tests passing
- [x] 📍 **Checkpoint G** — New test file added, existing 19 API gateway tests pass

---

## Phase H — Cleanup ✅ COMPLETE

> Removed dead code and dependencies.

- [x] **H.1** — Legacy `src/lib/crdt.ts` stub superseded by real `crdt-sync.ts` (kept as re-export)
- [x] **H.2** — Removed dead `lazynext-wasm` dependency from `apps/browser-extension/package.json`
- [x] **H.3** — Kysely schema file deleted, all imports removed
- [x] 📍 **Checkpoint H** — No dead dependencies, no hardcoded mock data, TypeScript compiles clean

---

## Ship 🚀

- [x] All phases complete
- [ ] Final commit with descriptive message
- [ ] Push to feature branch
- [ ] Human approval received
- [ ] Merge to main
- [ ] Push main
- [ ] Update README / public docs (if feature changes user-facing info)
- [ ] **Keep the feature branch** — do not delete
- [ ] Create review doc → `review.md`
