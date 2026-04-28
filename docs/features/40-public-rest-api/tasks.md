# ✅ Tasks: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/40-public-rest-api` (to be created)
> **Status**: 🔴 NOT STARTED
> **Progress**: 0/27 tasks complete

---

## Pre-Flight

- [x] Discussion doc is marked COMPLETE
- [x] Architecture doc is FINALIZED (status will flip to 🟢 once human reviews)
- [ ] Feature branch created from `main`
- [x] Dependent features merged: #03 ✅ #13 ✅ #31 ✅
- [ ] `@lazynext` org reserved on npm (one-shot ops task)
- [ ] `@scalar/api-reference` added to dependencies (human-approved per discussion)

---

## Phase A — Shared response-header utility

> Centralize the API contract before touching individual routes.

- [ ] **A.1** — Create `lib/utils/api-headers.ts` with `buildResponseHeaders(input)` per architecture spec
- [ ] **A.2** — Add request-id generation (uuid v4) and `X-Request-Id` propagation to existing Sentry tagging in `instrumentation.ts`
- [ ] **A.3** — Update one canary route (`app/api/v1/whoami/route.ts`) to call `buildResponseHeaders` end-to-end as the first integration
- [ ] 📍 **Checkpoint A** — `whoami` returns the new headers; existing tests still pass

---

## Phase B — Rate-limit two-tier enforcement

> Per-key buckets + workspace ceiling.

- [ ] **B.1** — Modify `lib/utils/api-key-auth.ts` to return `rateLimitContext: { keyId, workspaceId }`
- [ ] **B.2** — Modify `lib/utils/rate-limit.ts` to accept the tuple and enforce both buckets
- [ ] **B.3** — Add per-plan thresholds derived from `lib/utils/plan-gates.ts` (no new config file)
- [ ] **B.4** — Wire `429` responses to emit `Retry-After` + `X-RateLimit-*` headers via `buildResponseHeaders`
- [ ] **B.5** — Update existing `tests/unit/rate-limit.test.ts` for the new tuple shape; add tests for workspace-ceiling rejection
- [ ] 📍 **Checkpoint B** — Both per-key AND workspace-ceiling rejection paths covered by passing tests

---

## Phase C — Apply headers to all `/api/v1/*` routes

> Roll out `buildResponseHeaders` across the 24 route folders.

- [ ] **C.1** — Sweep every `app/api/v1/**/route.ts`; pipe responses through `buildResponseHeaders`
- [ ] **C.2** — Add an integration test (`tests/integration/api-headers.test.ts`) that hits every public route and asserts the contract headers are present
- [ ] 📍 **Checkpoint C** — Integration test green; no route returns without `X-Request-Id` + `X-API-Version`

---

## Phase D — Versioning policy + headers

> Stripe-style versioning; written and enforced.

- [ ] **D.1** — Write `docs/references/api-versioning.md` (policy: `/v1/` stays; `/v2/` lives alongside; 6-month sunset)
- [ ] **D.2** — Add `Sunset` + `Deprecation` + `Link` header support to `buildResponseHeaders` (no current deprecations; infrastructure for the future)
- [ ] **D.3** — Create `docs/references/api-changelog.md` with the v1 baseline entry
- [ ] 📍 **Checkpoint D** — Policy doc reviewed by human; deprecation header round-trips in a unit test

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
