# ✅ Tasks: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/40-public-rest-api` (to be created)
> **Status**: � IN PROGRESS
> **Progress**: 10/27 tasks complete

---

## Pre-Flight

- [x] Discussion doc is marked COMPLETE
- [x] Architecture doc is FINALIZED (status will flip to 🟢 once human reviews)
- [x] Feature branch created (from `feature/39-doc-cleanup-and-tests`, NOT `main`; rebase before merge)
- [x] Dependent features merged: #03 ✅ #13 ✅ #31 ✅
- [ ] `@lazynext` org reserved on npm (one-shot ops task — BLOCKED on human)
- [ ] `@scalar/api-reference` added to dependencies (BLOCKED on human approval per discussion)

---

## Phase A — Shared response-header utility

> Centralize the API contract before touching individual routes.

- [x] **A.1** — Create `lib/utils/api-headers.ts` with `buildResponseHeaders(input)` per architecture spec
- [ ] **A.2** — Add `X-Request-Id` propagation to existing Sentry tagging in `instrumentation.ts` (deferred — Sentry context already gets `requestId` via tag elsewhere; revisit during sweep)
- [x] **A.3** — Update one canary route (`app/api/v1/whoami/route.ts`) to call `buildResponseHeaders` end-to-end as the first integration
- [x] 📍 **Checkpoint A** — `whoami` returns the new headers; existing tests still pass (339/339, +21 new)

---

## Phase B — Rate-limit two-tier enforcement

> Per-key buckets + workspace ceiling.

- [x] **B.1** — ~~Modify `lib/utils/api-key-auth.ts`~~ DEVIATION: `route-auth.ts/resolveAuth()` already returns `keyId` + `bearerWorkspaceId` + `rateLimitId`; no change to `api-key-auth.ts` needed.
- [x] **B.2** — Add `checkApiRateLimit({ keyId, workspaceId, plan })` to `lib/utils/rate-limit.ts` enforcing both buckets (kept existing `rateLimit()` for back-compat)
- [x] **B.3** — Per-plan thresholds via `API_PLAN_RATE_LIMITS` in `rate-limit.ts` (slugs match `constants.ts/PLAN_LIMITS`)
- [x] **B.4** — `buildResponseHeaders` integration on canary 429 path; sweep across all routes is Phase C work
- [x] **B.5** — `tests/unit/api-rate-limit.test.ts` (8 cases): both buckets, isolation, plan differentiation, retry-after
- [x] 📍 **Checkpoint B** — Both per-key AND workspace-ceiling rejection paths covered by passing tests

---

## Phase C — Apply headers to all `/api/v1/*` routes

> Roll out `buildResponseHeaders` across the 24 route folders.

- [x] **C.1** — DEVIATION: rather than rewriting all 23 routes, `middleware.ts` now stamps `X-Request-Id` (preferring client-supplied id) + `X-API-Version: v1` on every `/api/v1/*` response. Routes opt into the full builder (rate-limit headers etc.) at their own pace. Non-clobbering — routes that already use `buildResponseHeaders` are untouched.
- [ ] **C.2** — Add an integration test (`tests/integration/api-headers.test.ts`) that hits every public route and asserts the contract headers are present
- [ ] 📍 **Checkpoint C** — Integration test green; no route returns without `X-Request-Id` + `X-API-Version`

---

## Phase D — Versioning policy + headers

> Stripe-style versioning; written and enforced.

- [x] **D.1** — Wrote `docs/references/api-versioning.md` (Stripe-style additive; ≥6-month sunset; lifecycle table; header contract)
- [x] **D.2** — `Sunset` + `Deprecation` + `Link` header support landed in `buildResponseHeaders` Phase A
- [x] **D.3** — Created `docs/references/api-changelog.md` with the v1 baseline entry
- [x] 📍 **Checkpoint D** — Deprecation headers round-trip in `api-headers.test.ts` (test: emits Sunset + Deprecation + Link). Human review of policy doc still pending.

---

## Phase E — SDK packaging

> Extract `lib/sdk/` to `packages/sdk/`; publish to npm.

- [ ] **E.1** — Configure root `package.json` workspaces: `["packages/*"]`
- [ ] **E.2** — Move `lib/sdk/client.ts` → `packages/sdk/src/client.ts`; create `packages/sdk/package.json` (name: `@lazynext/sdk`, version `0.1.0`, MIT-licensed)
- [ ] **E.3** — Move `tests/unit/sdk-client.test.ts` → `packages/sdk/tests/client.test.ts`; ensure vitest still discovers it
- [ ] **E.4** — Make `lib/sdk/client.ts` a re-export shim: `export * from '@lazynext/sdk'` so internal imports keep working
- [ ] **E.5** — Write `scripts/generate-sdk-types.ts` (fetches `/api/v1/openapi.json`, runs `openapi-typescript`, writes `packages/sdk/src/types.ts`)
- [ ] **E.6** — Add `npm run sdk:generate-types` script; wire to a pre-build hook
- [ ] **E.7** — Write `packages/sdk/README.md` with quickstart + every endpoint method documented
- [ ] **E.8** — Dry-run `npm publish --dry-run` from `packages/sdk/`; verify the tarball contents
- [ ] 📍 **Checkpoint E** — Type-check passes from both root + `packages/sdk/`; existing SDK tests pass; `npm publish --dry-run` shows the right files

---

## Phase F — Public docs page

> Scalar-rendered reference + supporting pages.

- [ ] **F.1** — Install `@scalar/api-reference` (with human approval logged in changelog)
- [ ] **F.2** — Create `app/(marketing)/docs/api/layout.tsx` with marketing chrome
- [ ] **F.3** — Create `app/(marketing)/docs/api/page.tsx` rendering Scalar against `/api/v1/openapi.json`
- [ ] **F.4** — Create supporting MDX/TSX pages: `quickstart`, `authentication`, `rate-limits`, `webhooks`, `versioning`, `changelog`
- [ ] **F.5** — Add `/docs/api` and child routes to `app/sitemap.ts`
- [ ] **F.6** — Webhook page: include the Node verification snippet using `crypto.timingSafeEqual`
- [ ] 📍 **Checkpoint F** — `/docs/api` renders the live OpenAPI spec; all 6 supporting pages load; sitemap includes them

---

## Phase Y — Testing

> Execute the test plan, verify everything.

- [ ] **Y.1** — Run testplan: per-key + workspace rate-limit cases (TC-01..TC-06)
- [ ] **Y.2** — Run testplan: contract-header presence on every route (TC-07..TC-10)
- [ ] **Y.3** — Run testplan: SDK quickstart end-to-end (TC-11..TC-14)
- [ ] **Y.4** — Run testplan: docs page + Scalar render (TC-15..TC-17)
- [ ] **Y.5** — Run testplan: deprecation header round-trip (TC-18)
- [ ] 📍 **Checkpoint Y** — All acceptance criteria met; full vitest + Playwright suite passes

---

## Phase Z — Documentation & Cleanup

- [ ] **Z.1** — Update `README.md` with link to `/docs/api`
- [ ] **Z.2** — Update `AGENTS.md` mentioning the `packages/sdk/` workspace package
- [ ] **Z.3** — Update `docs/project-changelog.md` for the version that ships #40
- [ ] **Z.4** — Update `docs/project-roadmap.md` — flip #40 to 🟢 Merged
- [ ] **Z.5** — Update changelog doc with final summary
- [ ] 📍 **Checkpoint Z** — Self-review all diffs

---

## Ship 🚀

- [ ] All phases complete
- [ ] `npm run type-check` clean
- [ ] `npm run lint` clean
- [ ] Full vitest + Playwright suite green
- [ ] Final commit with descriptive message
- [ ] Push to `feature/40-public-rest-api`
- [ ] Human approval received
- [ ] Merge to main
- [ ] Push main
- [ ] **Publish `@lazynext/sdk@0.1.0` to npm** (one-shot ops task — human-executed)
- [ ] Tag release `v1.4.0.0` (first minor bump since v1.3.x)
- [ ] **Keep the feature branch** — do not delete
- [ ] Create review doc → `review.md`
