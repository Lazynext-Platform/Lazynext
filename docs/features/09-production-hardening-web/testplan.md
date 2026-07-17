# 🧪 Test Plan: Production Hardening — Web App

> **Feature**: `09` — Production Hardening — Web App
> **Tasks**: [`tasks.md`](tasks.md)
> **Date**: 2026-06-30

---

## Acceptance Criteria

- [ ] API Gateway accepts real JWT tokens, rejects invalid/hardcoded tokens
- [ ] Dodo Payments webhook verifies HMAC signatures, rejects unverified payloads
- [ ] Single Drizzle ORM with consistent schema across all auth + app tables
- [ ] Admin dashboards show real data from PostgreSQL (or empty states when no data)
- [ ] No mock-db.ts serving fake data in any route
- [ ] GPU-rendered video frames display in preview canvas via WebGPU
- [ ] Bidirectional CRDT sync: local edits → WASM → peers, remote patches → WASM → UI
- [ ] Export pipeline: project → render-service → download valid MP4/ProRes video file
- [ ] E2E test: auth → create project → edit → export passes in Chromium, Firefox, WebKit
- [ ] All CI checks pass: cargo fmt/clippy/test, bun typecheck/lint/test

---

## Test Cases

### TC-01: JWT Authentication — Valid Token

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | User registered via Better Auth, valid JWT exists |
| **Steps** | 1. Generate valid JWT with Better Auth → 2. Call `GET /api/v1/projects` with `Authorization: Bearer <token>` → 3. Verify response |
| **Expected Result** | 200 OK, returns user's projects |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-02: JWT Authentication — Invalid Token

| Property | Value |
|---|---|
| **Category** | Error |
| **Precondition** | None |
| **Steps** | 1. Call `GET /api/v1/projects` with `Authorization: Bearer invalid-token` → 2. Verify response |
| **Expected Result** | 401 Unauthorized |
| **Status** | ⬜ Not Run |
| **Notes** | Must reject all 3 previously hardcoded tokens |

### TC-03: JWT Authentication — Expired Token

| Property | Value |
|---|---|
| **Category** | Error |
| **Precondition** | Expired JWT (< 1 hour ago) |
| **Steps** | 1. Call `GET /api/v1/projects` with expired token → 2. Verify response |
| **Expected Result** | 401 Unauthorized, message "token expired" |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-04: Dodo Payments Webhook — Valid Signature

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | `DODO_WEBHOOK_SECRET` configured |
| **Steps** | 1. Construct Dodo Payments event JSON → 2. Sign with `DODO_WEBHOOK_SECRET` → 3. POST to `/api/dodo/webhook` with valid `dodo-signature` header |
| **Expected Result** | 200 OK, event processed |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-05: Dodo Payments Webhook — Invalid Signature

| Property | Value |
|---|---|
| **Category** | Error |
| **Precondition** | `DODO_WEBHOOK_SECRET` configured |
| **Steps** | 1. POST to `/api/dodo/webhook` with random signature |
| **Expected Result** | 400 Bad Request, signature mismatch |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-06: Database — Drizzle ORM Consolidated Schema

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Database migrated to Drizzle-only |
| **Steps** | 1. Run `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` → 2. Verify all auth + app tables exist → 3. Verify foreign keys |
| **Expected Result** | Tables: user, session, account, verification, subscriptions, projects, timelines, tracks, clips, agents, feedback, assets. FKs: projects.user_id → user.id, assets.project_id → projects.id |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-07: Admin Dashboard — Real Data

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | At least 1 user, 1 project in database |
| **Steps** | 1. Navigate to `/admin` → 2. Verify org stats → 3. Verify user count → 4. Verify project count |
| **Expected Result** | Shows real user/project counts from PostgreSQL, not hardcoded mock data |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-08: Admin Dashboard — Empty State

| Property | Value |
|---|---|
| **Category** | Edge Case |
| **Precondition** | Fresh database, no data |
| **Steps** | 1. Navigate to `/admin` → 2. Verify page renders |
| **Expected Result** | Shows "No data yet" empty states, not fake mock data |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-09: GPU Preview — WebGPU Rendering

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Browser supports WebGPU, project with video clips loaded |
| **Steps** | 1. Open editor with video project → 2. Verify preview canvas uses WebGPU renderer → 3. Play timeline → 4. Verify frames render |
| **Expected Result** | Frames render via GPU, playhead scrubs through frames smoothly |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-10: GPU Preview — CPU Fallback

| Property | Value |
|---|---|
| **Category** | Edge Case |
| **Precondition** | Browser does NOT support WebGPU (Firefox without flag) |
| **Steps** | 1. Open editor in non-WebGPU browser → 2. Verify preview renders |
| **Expected Result** | Falls back to Fabric.js CPU canvas, frames still render (slower) |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-11: CRDT Sync — Bidirectional

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | WASM CRDT engine loaded, WebSocket connected |
| **Steps** | 1. Add clip via UI → 2. Verify CRDT operation sent to WASM → 3. Verify React state updated from WASM → 4. Verify CRDT delta broadcast to WebSocket |
| **Expected Result** | Clip appears in timeline, CRDT operation logged, delta sent to peers |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-12: CRDT Sync — Convergence (2 Peers)

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Two browser contexts connected to same project |
| **Steps** | 1. Peer A adds clip at time 5s → 2. Peer B adds text at time 3s → 3. Both refresh → 4. Verify both timelines are identical |
| **Expected Result** | Both timelines contain clip at 5s AND text at 3s, regardless of operation order |
| **Status** | ⬜ Not Run |
| **Notes** | Key CRDT convergence property |

### TC-13: Export — Full Pipeline (MP4)

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Project with video clips, render-service running |
| **Steps** | 1. Open project → 2. Click Export → 3. Select MP4 format → 4. Wait for render → 5. Download file |
| **Expected Result** | Valid MP4 file downloaded, matches timeline content |
| **Status** | ⬜ Not Run |
| **Notes** | E2E test covers this |

### TC-14: Export — ProRes Format

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Project with video clips, render-service running |
| **Steps** | 1. Open project → 2. Click Export → 3. Select ProRes 422 HQ → 4. Wait for render → 5. Download file |
| **Expected Result** | Valid MOV file with ProRes codec |
| **Status** | ⬜ Not Run |
| **Notes** | — |

### TC-15: Export — Progress Streaming

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Large project (1+ minute) |
| **Steps** | 1. Start export → 2. Verify progress bar updates → 3. Verify percentage increases → 4. Verify completion notification |
| **Expected Result** | SSE progress events displayed in UI, progress bar increments, download link appears on completion |
| **Status** | ⬜ Not Run |
| **Notes** | — |

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| 1 | WebSocket disconnects mid-edit | Auto-reconnect with exponential backoff, re-sync CRDT state from server |
| 2 | GPU device lost during preview | Reset GPU device, recreate swap chain, continue rendering |
| 3 | Export with no clips | Show error "Cannot export empty timeline" |
| 4 | Export exceeds max duration | Show warning "Long exports may take several minutes" |
| 5 | Rate limit exceeded | Return 429 with Retry-After header, UI shows "Too many requests" |
| 6 | Database connection drops | Graceful degradation: show cached data, retry connection |
| 7 | Migration applied to already-migrated DB | Idempotent: no-op, no errors |

## Security Tests

| # | Test | Expected |
|---|---|---|
| 1 | Hardcoded token `admin-token-123` on `/api/v1/projects` | 401 Unauthorized (rejected) |
| 2 | Hardcoded token `editor-token-456` on `/api/v1/projects` | 401 Unauthorized (rejected) |
| 3 | Hardcoded token `viewer-token-789` on `/api/v1/projects` | 401 Unauthorized (rejected) |
| 4 | Dodo Payments webhook with forged signature | 400 Bad Request |
| 5 | CSRF: POST without CSRF header | 403 Forbidden |
| 6 | JWT with tampered claims (modified role) | 401 Unauthorized |
| 7 | JWT with `none` algorithm | 401 Unauthorized (rejected) |

## Performance Considerations

| Metric | Target | Actual |
|---|---|---|
| GPU frame render time (1080p) | < 16ms (60fps) | — |
| CRDT sync latency (local) | < 10ms | — |
| Export pipeline: 60s video | < 3 minutes | — |
| API Gateway auth overhead | < 1ms per request | — |
| Database query (projects list) | < 50ms | — |

---

## Test Summary

<!-- Fill after running all tests -->

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Happy Path | — | — | — | — |
| Error Cases | — | — | — | — |
| Edge Cases | — | — | — | — |
| Security | — | — | — | — |
| **Total** | — | — | — | — |

**Result**: ⬜ NOT RUN | ✅ ALL PASS | ❌ HAS FAILURES
