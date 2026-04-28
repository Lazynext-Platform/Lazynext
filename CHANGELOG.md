# Changelog

All notable changes to Lazynext will be documented in this file.

> **Full version history** lives in [`docs/project-changelog.md`](docs/project-changelog.md). This file carries the most recent versions only — when in doubt, the docs version is the source of truth for entries older than the latest few releases.

## [Unreleased]

## [1.4.1.1] - 2026-04-29

**Theme:** SEO + security fixes after a deep audit pass.

### Fixed
- **Social-card breakage** — `app/layout.tsx` openGraph and Twitter image fields were hardcoded to `/og-image.png`, a path that doesn't exist in `/public`. Every shared link on Twitter / Slack / LinkedIn / Discord rendered a broken image. Removed the override so Next's file-convention auto-merge of `app/opengraph-image.tsx` (Edge runtime, generated 1200×630 PNG) takes over for both card types.
- **Stale OpenAPI `info.version`** — `lib/utils/openapi.ts` had `PACKAGE_VERSION` hardcoded to `'1.3.42.0'`, five releases behind production. Every consumer of `/api/v1/openapi.json` (SDK code-gen, doc portals, version-tracking clients) was getting outdated version metadata. Now imported from `package.json` so it stays in sync with the standard release flow.
- **DB error message leak** (info disclosure, OWASP A09) — 8 sites across 5 API routes were echoing `PostgrestError.message` directly into HTTP 500 responses, leaking schema details (table names, column names, RLS policy names, constraint descriptions). All sites now return `{ error: 'DATABASE_ERROR' }` with the raw error funneled through dev-only `console.error`. Sentry still captures full traces server-side.
  - Routes patched: `app/api/v1/onboarding/workspace/route.ts` (5 sites), `app/api/v1/workspaces/route.ts` (2), `app/api/v1/threads/[nodeId]/route.ts` (2), `app/api/v1/import/route.ts` (2), `app/api/v1/templates/[id]/install/route.ts` (1).

### Added
- **JSON-LD structured data on marketing pages** — `app/(marketing)/layout.tsx` emits a single `application/ld+json` script with an `@graph` of `Organization` + `SoftwareApplication` (with free-tier `Offer`). Inherited by all 19 public routes. Zero LCP/CLS impact.

### Validation
- 350/350 Vitest tests pass
- Type-check + lint clean
- Build warning-free except the intentional `<img>` in `global-error.tsx`

## [1.4.1.0] - 2026-04-29

**Theme:** Performance + security tightening on top of the v1.4.0.1 polish.

### Performance
- `app/shared/[id]/SharedCanvasMount.tsx` (new) + `app/shared/[id]/page.tsx` — the public shared-canvas viewer now lazy-loads `@xyflow/react` and the seven node-type components via `next/dynamic` with `ssr: false`. The existing `/workspace/.../canvas/[id]` route already used this pattern; bringing `/shared/[id]` in line:
  - First Load JS: **274 kB → 208 kB** (-66 kB, -24%)
  - Page chunk: **59.5 kB → 2.1 kB** (-96%)
  - SEO: unaffected — the canvas is SVG/Canvas after hydration regardless, page title and OG tags still ship server-rendered.
- `next.config.js` — added `experimental.optimizePackageImports` for `lucide-react` and `@xyflow/react`. Next 14 already tree-shakes lucide's modular paths well, so no measured delta on current call sites, but it hardens against future namespace-style imports.

### Security
- `next.config.js` — two new global response headers:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2 years, preload-ready; submission to hstspreload.org is a separate one-shot human task).
  - `X-DNS-Prefetch-Control: on` — explicit opt-in for cross-origin DNS prefetch (Supabase, Gumroad, Sentry).

### Validation
- 350/350 Vitest tests pass
- Type-check + lint clean
- Build warning-free except the intentional `<img>` in `global-error.tsx`

## [1.4.0.1] - 2026-04-28

**Theme:** Post-release polish — eight live-QA passes after the v1.4.0.0 Public REST API ship found no functional regressions but a long tail of small UX, a11y, deprecation, and dead-code papercuts. All fixed in one rolling sweep.

### Fixed
- `app/(marketing)/docs/api/layout.tsx` — sticky sub-nav was hidden behind the fixed marketing header (`top-0 z-30` rendered behind `top-0 z-50 h-16`). Wrapper got `pt-16`; bar moved to `top-16 z-40`. Active page now gets a pill, others get muted hover. `aria-current="page"` for SR.
- `lib/db/supabase/middleware.ts` — auth gate inverted from "isPublicRoute allowlist" to a `PROTECTED_PREFIXES` denylist (`/workspace`, `/onboarding`). Unknown URLs now hit the real 404 page instead of being 307'd to `/sign-in`. When unauthed users hit a protected route the middleware now appends `?next=<original-path>` so sign-in can return them after auth.
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` — reads `?next=` via `useSearchParams`, validates with `safeNext()` (relative-only, rejects absolute and protocol-relative), and uses it for both password and OAuth flows. The auth callback already supported `?next=` — no changes needed there.
- `app/(app)/onboarding/page.tsx` — created; redirects to `/onboarding/create-workspace` so the bare `/onboarding` URL no longer 404s.
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` — added the standard "By creating an account you agree to our Terms and Privacy Policy" disclosure under the submit button.
- `app/robots.ts` — added explicit `Allow: /api/v1/openapi.json`. The blanket `Disallow: /api/` was inadvertently blocking the OpenAPI spec from search.
- `app/(marketing)/comparison/page.tsx` — table headers crammed at narrow viewports. Added `min-w-[640px]` so the existing `overflow-x-auto` wrapper handles horizontal scroll cleanly; added per-column padding so labels breathe.
- `components/ui/EmptyStates.tsx` — `NotFoundState` button labeled "Go to Dashboard" but `href="/"` lands on the marketing home. Relabeled to "Go Home" so label matches behaviour.
- `components/decisions/OutcomeReviewModal.tsx` — Notes and Key Learning textareas had visible `<label>` tags but no `htmlFor`/`id` link. Screen readers announced them as nameless "edit text". Added `outcome-notes` / `outcome-learning` id pairs.

### Changed
- `next.config.js` — migrated two deprecated Sentry top-level config keys (`disableLogger`, `automaticVercelMonitors`) to their new `webpack.*` nested locations. Same behaviour, build is now warning-free except the intentional `<img>` in `global-error.tsx`.
- Renamed `sentry.client.config.ts` → `instrumentation-client.ts` per Next 15/Sentry's new file convention. Required for Turbopack compatibility.

### Removed
- `components/decisions/DecisionCard.tsx` — orphan component, no callers anywhere. The decisions page renders inline cards via `DecisionsClient.tsx`; the public `/d/[shareId]` page renders its own shared view.

### Docs
- `docs/project-roadmap.md`, `docs/features/40-public-rest-api/{tasks,discussion}.md` — replaced 3 stray `U+FFFD` replacement glyphs left over from the #40 release with the intended 🟢 status emoji.

### Validation
- 350/350 Vitest tests pass (40 files)
- Type-check clean
- Lint warning-free (one pre-existing `<img>` in `global-error.tsx` only — intentional, runs before the `next/image` runtime is guaranteed)
- All 4 fixes from QA round 2 (`1fd530e`) verified live by browser QA in round 4
- All 3 fixes from QA round 3 (`60a1189`) verified live: redirect preserves `?next=`, 404 returns HTTP 404, comparison renders cleanly

## [1.3.42.4] - 2026-04-28

**Theme:** Documentation accuracy — round 3 (summary prose sweep).

### Fixed
- `docs/features/13-billing-subscription/summary.md` — "Per-seat pricing in INR (₹)" replaced with the truth: USD per seat sourced from `lib/utils/constants.ts`, locale-formatted via `formatPrice`.
- `docs/features/22-upgrade-paywall-modal/summary.md` — "INR prices from `lib/billing/plans.ts`" (file doesn't exist) replaced with the real source-of-truth pointer to `lib/utils/constants.ts`.

## [1.3.42.3] - 2026-04-28

**Theme:** Documentation accuracy — round 2 (roadmap + cross-cutting docs).

### Fixed
- `docs/project-roadmap.md` header — `Current Milestone` was stuck at v1.3.28.1; synced to v1.3.42.2. Replaced two broken `�` glyphs with the proper 🟡 yellow circle in the Phase 2 table.
- `docs/features/02-pricing-page/testplan.md` — currency was wrongly described as INR. Real source of truth: `lib/utils/constants.ts` exports `PLAN_PRICING_USD` / `PLAN_PRICING_USD_ANNUAL`; the pricing page formats per-locale via `formatPrice`. Constants path corrected (had `lib/billing/plans.ts` — doesn't exist). Missing-Gumroad-env fallback corrected (real fallback is `/sign-up`, not `/contact`).

## [1.3.42.2] - 2026-04-28

**Theme:** Documentation accuracy audit of the v1.3.42.1 backfill — caught file-tree drift introduced during retroactive writing.

### Fixed
- `AGENTS.md` `lib/` tree — added the 7 real subdirs that had been omitted (`canvas/`, `data/`, `i18n/`, `oauth/`, `realtime/`, `sdk/`, `wms.ts`).
- `docs/features/01-landing-page/architecture.md` — file structure updated to match `components/marketing/`. Removed three fictional components (`SocialProofBar`, `TestimonialsSection`, `MobileMenu`) and added the two real ones (`MarketingHeader`, `FoundingMemberBanner`).
- `docs/features/03-auth-pages/architecture.md` and `testplan.md` — rewrote to match real code: inline `'use client'` pages at `app/(auth)/sign-{in,up}/[[...sign-{in,up}]]/page.tsx`, only `/auth/callback` route handler exists, email-confirm and reset-password go through Supabase-hosted screens. Removed fictional `components/auth/`, `app/auth/confirm/`, `app/auth/reset-password/` references.
- `docs/features/05-workflow-canvas/architecture.md` — rewrote against ground truth: `WorkflowCanvas.tsx` (not `Canvas.tsx`), `WorkflowEdge.tsx` (not `DefaultEdge.tsx`), real `lib/canvas/` hook-based persisters, snapshot-based history, real `app/(app)/workspace/[slug]/canvas/[id]/` route, `nodes/positions/route.ts` for bulk position patches.

## [1.3.42.1] - 2026-04-28

**Theme:** Mastery-framework documentation backfill across all 38 features.

### Added
- `summary.md` for features #04 and #06–#38 (34 retroactive summaries) — what was built, key decisions (reconstructed from code/commits/design docs, not fabricated), files affected, dependencies, notes. Per Mastery's mid-project adoption rule, full lifecycle docs were **not** fabricated for already-shipped features.
- `review.md` for shipped features #01, #02, #03, #05.
- `architecture.md` and `testplan.md` for #03 and #05; `testplan.md` for #02.
- `Documentation` section in `README.md` linking the doc set.
- `docs/features/FEATURE-INDEX.md` header now explains the retroactive-summary convention.

## [1.3.42.0] - 2026-04-28

**Theme:** Bearer auth on `/search`. CI runners can dedupe before opening duplicate decisions or tasks.

### Added
- `GET /api/v1/search?workspaceId=...&q=...` is bearer-aware. Returns grouped results: nodes, decisions, workflows.
- OpenAPI spec entry for `/search` (11 paths total).

## [1.3.41.0] - 2026-04-28

**Theme:** Bearer auth on `/threads/{nodeId}`. CI runners can post comments to task nodes — e.g. "build #1234 failed: <link>" auto-posted on a related decision.

### Added
- `GET /api/v1/threads/{nodeId}` and `POST /api/v1/threads/{nodeId}` are bearer-aware.
- POST requires `write` scope and uses the mutation rate-limit bucket (30/min).
- OpenAPI spec entry for `/threads/{nodeId}` (10 paths total).

### Changed
- All thread routes authenticate before resource lookup — no anonymous existence-probing.
- Thread auto-creation now uses the authenticated workspace (from the node row), never a query-string `workspaceId` — closes a hypothetical cross-workspace insert vector that bearer keys could otherwise have triggered.

## [1.3.40.0] - 2026-04-28

**Theme:** Bearer auth on `/edges`. Closes the canvas-graph surface — nodes + edges are both fully programmable now.

### Added
- `GET /api/v1/edges`, `POST /api/v1/edges`, `DELETE /api/v1/edges` are bearer-aware.
- POST and DELETE require `write` scope and use the mutation rate-limit bucket (30/min).
- OpenAPI spec entry for `/edges` (9 paths total).

### Changed
- All edge routes authenticate before resource lookup — no anonymous existence-probing.

### Why
- Connecting two task nodes via an automation now works end-to-end from a CI runner.

## [1.3.39.0] - 2026-04-28

**Theme:** Bearer auth lands on `/api/v1/nodes`. CI runners and external automations can now create/update/delete tasks, docs, decisions — the canvas-as-API surface.

### Added
- `GET /api/v1/nodes`, `POST /api/v1/nodes`, `GET /api/v1/nodes/{id}`, `PATCH /api/v1/nodes/{id}`, `DELETE /api/v1/nodes/{id}` are bearer-aware.
- Mutations (POST/PATCH/DELETE) require `write` scope and use the mutation rate-limit bucket (30/min).
- Reads use the api bucket (100/min).
- OpenAPI spec entry for `/nodes` and `/nodes/{id}` with full schema.
- `Node` schema in `components.schemas`.

### Changed
- All node routes authenticate BEFORE looking up the row — anonymous callers can't probe node/workflow existence by ID.
- Audit log entries on node mutations now record `viaApiKey: true` when the call came from a bearer key.

### Why
- The bearer story extends to the canvas surface that 80% of integrations actually want — "open a task from my CI run when a build fails". The OpenAPI spec now documents 8 paths instead of 6.

## [1.3.38.0] - 2026-04-28

**Theme:** Identity introspection. SDK consumers can now verify their bearer key resolves to the right workspace and scopes BEFORE running a real call.

### Added
- `GET /api/v1/whoami` — returns `{ authType, userId, workspaceId, keyId, keyPrefix, keyName, scopes }` for bearer requests; `{ authType: 'session', userId, scopes }` for cookie sessions. Read-only — no scope requirement so `read`-only keys can verify themselves. Rate-limited on the api bucket.
- `LazynextClient.whoami()` returning `WhoamiResponse`.
- OpenAPI 3.1 spec entry for `/whoami` (six paths now documented).
- 1 SDK test covering the happy path (296 → 297).

### Why
- Top integrator question is "is my key wired right?". Without `/whoami` they had to call `/decisions` and read the workspace_id back — a mutation budget burned on a misconfiguration check.

## [1.3.37.0] - 2026-04-28

**Theme:** Typed TypeScript client for the public REST API. Zero dependencies, copy-pasteable, error codes are first-class.

### Added
- `lib/sdk/client.ts` — `LazynextClient` with `decisions.{list,get,create,update,delete}`. Bearer header set automatically.
- `LazynextApiError` with stable `code` field: `UNAUTHORIZED | INSUFFICIENT_SCOPE | RATE_LIMITED | NOT_FOUND | BAD_REQUEST | SERVER_ERROR | UNKNOWN`. `requiredScope` populated for 403s. Callers branch on the code, not the prose.
- `lib/sdk/index.ts` re-exports the public surface.
- `tests/unit/sdk-client.test.ts` — 10 tests covering bearer header, JSON body, every error mapping (286 → 296).
- `/docs/api` mentions the typed client.

### Why
- OpenAPI shipped in v1.3.36.0; the client is the first thing every integrator builds. Shipping it ourselves means the integration story is "copy this file" rather than "hand-roll fetch wrappers".

## [1.3.36.0] - 2026-04-28

**Theme:** Machine-readable API spec at `/api/v1/openapi.json`. SDK generators, Postman, and IDE plugins can now consume Lazynext's REST surface programmatically.

### Added
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec covering all bearer-aware endpoints (`/decisions` list+POST, `/decisions/{id}` GET+PATCH+DELETE, `/decisions/export-csv`, `/export`, `/audit-log`). Public, edge-cached 5min.
- `lib/utils/openapi.ts` — hand-written `buildOpenApiSpec()`. Hand-written so it documents what we actually promise, not whatever a generator decides to expose.
- 7 unit tests asserting every endpoint requires `workspaceId`, every mutation declares INSUFFICIENT_SCOPE on 403, and export endpoints reference the export bucket (286 total).
- Link to the spec from `/docs/api`.

### Why
- Hand-written OpenAPI is the smallest viable step toward an SDK without forcing us into a generator's idioms. Future SDK ships consume this file.

## [1.3.35.0] - 2026-04-28

**Theme:** Production migrations now apply automatically. Closes the deployment gap that was silently breaking the last three ships' write-scope keys.

### Added
- `.github/workflows/db-migrate.yml` — applies `supabase/migrations/**` on every push to main. Runs `supabase link → db push --dry-run → db push`. Concurrency-locked so two deploys can't fight over Postgres locks. Manual `workflow_dispatch` for re-running stuck migrations.

### Why
- `20260428000003_api_key_scopes.sql` shipped on 2026-04-28 but was never applied to production. `normalizeScopes()` quietly fell back to `['read']`, so freshly-minted write keys would 403 every mutation. No CI step existed to apply migrations — only manual `npm run db:migrate`.
- Now: merge to main → CI applies migrations → Vercel redeploys against the migrated schema. The dry-run prints the SQL to the workflow log for audit.

### Configuration
- Repo secrets required: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`. Without them the job logs a warning and no-ops, so forks stay green.

## [1.3.34.1] - 2026-04-28

**Hotfix.** Production smoke-test caught `/docs/api` 307'ing to `/sign-in`. The middleware's public-route whitelist exact-matched `/docs` but had no prefix match, so the new API reference was effectively gated behind login.

### Fixed
- `lib/db/supabase/middleware.ts` — `/docs/*` paths are now public. Exact `/docs` continues to work; `/docs/api` (and any future sub-route) renders without auth.

## [1.3.34.0] - 2026-04-28

**Theme:** Bearer auth lands on the rest of the decisions surface, key rotation goes live, and rate-limit buckets get per-endpoint tuning.

### Added
- `POST /api/v1/api-keys/[id]/rotate` — atomically swaps a key's hash and prefix while preserving id, name, scopes, and audit lineage. New plaintext shown once, old plaintext stops working immediately.
- `api_key.rotate` `AuditAction`. Same `resourceId` as the create entry so audit logs naturally group create → rotate → revoke.
- `RATE_LIMITS.export` (10/min) on `/export` and `/decisions/export-csv`. Heavy reads.
- `RATE_LIMITS.mutation` (30/min) on `POST/PATCH/DELETE /decisions`. Tighter than reads.
- `Rotate` button in `ApiKeysPanel` with confirm guard.
- `rotateApiKey` data helper + 2 tests (277 → 279).

### Changed
- `GET /api/v1/decisions/[id]`, `PATCH /api/v1/decisions/[id]`, `DELETE /api/v1/decisions/[id]` are bearer-aware. PATCH and DELETE require `write` scope.
- `/docs/api` updated with the rotate endpoint and tightened bucket numbers.

### Why
- Rotation closes the lifecycle: a workspace owner can react to a leak in seconds without losing audit lineage.
- Per-endpoint buckets stop a leaked key from scraping the entire workspace at 100 req/min.
- The decisions CRUD surface is now fully scriptable from a CI runner.

## [1.3.33.0] - 2026-04-28

**Theme:** Bearer-auth completes its v1 surface area. Per-key scopes (read / write), the first bearer-aware mutation route (`POST /api/v1/decisions`), API key UX polish, and a public API reference at `/docs/api`. The bearer story is now end-to-end usable for an external CI runner or scripting client.

### Added
- **API key scopes** — keys are minted with `read`, `write`, or both. Default is `['read']` (least-privilege). New migration `20260428000003_api_key_scopes.sql` adds `scopes TEXT[] NOT NULL DEFAULT ARRAY['read']` with a CHECK constraint. `lib/data/api-keys.ts` exports `API_KEY_SCOPES` + `normalizeScopes()`.
- **`requireScope(auth, scope)` helper** in `lib/utils/route-auth.ts` — returns null on pass, prebuilt 403 `INSUFFICIENT_SCOPE` (with a `requiredScope` field) on miss. Cookie sessions auto-pass; bearer keys are checked against their stored scopes.
- **First bearer-aware mutation route** — `POST /api/v1/decisions` now accepts API keys with the `write` scope. Read-only keys hitting it get `403 INSUFFICIENT_SCOPE`.
- **API reference page** at `/docs/api` — covers auth, scopes, rate-limits, all 4 read endpoints + the new write endpoint, error codes. Honest, single-page, no auto-generated fluff.
- **API keys UX** — "Allow write" checkbox at create time, `read-only` / `read + write` badges per key in the list, `expires in Nd` / `expired` badges with red/amber/slate colour urgency.
- **6 new tests** (277 total, was 271): `normalizeScopes` whitelisting + dedupe, `requireScope` pass + 403 fail, scopes-on-resolveAuth assertions for bearer + cookie sessions.

### Changed
- `lib/utils/api-key-auth.ts` — `ApiKeyAuthResult` now carries `scopes: ApiKeyScope[]`; the lookup query selects the new column.
- `AuthOk` carries `scopes` end-to-end. Cookie sessions are auto-granted the full set (`['read', 'write']`).
- `POST /api/v1/api-keys` — accepts an optional `scopes` array on create; the audit metadata records it.
- `app/api/v1/decisions/route.ts` POST — swapped `safeAuth + verifyWorkspaceMember` for `requireWorkspaceAuth + requireScope('write')`. Rate-limit now uses `auth.rateLimitId` (per-keyId for bearer).

### Why this matters
- **Defence in depth.** A leaked CSV-export key can no longer be turned into a decision-creation key. Mutation is gated at three layers: workspace ownership, key validity, and explicit scope.
- **External writes are now possible** — a Slack bot or CI runner can log decisions automatically by minting a key with `write` scope.
- **Public docs close the loop** — `/docs/api` is the page a developer lands on when they ask "can I script this?".

### Deferred (intentionally)
- Per-route rate-limit overrides (mutations should probably be tighter than 100/min).
- Bearer auth on more mutation routes (workspace.update, member.invite, decision.update). Each rolls out individually with explicit audit + scope review.
- A `keys.update` endpoint (rotate scope on existing keys).

## [1.3.32.0] - 2026-04-28

**Theme:** Bearer-auth machinery hardening. Three loose ends from v1.3.31.0 close in one ship: per-keyId rate-limit buckets, audit-log entries on key issuance + revocation, and an `api_key.*` filter on the audit-log API.

### Added
- `AuthOk.rateLimitId` on `lib/utils/route-auth.ts` — `key:<keyId>` for bearer requests, `user:<userId>` for cookie sessions. A leaked API key now burns its own bucket instead of the human user's.
- Two new `AuditAction` values: `api_key.create`, `api_key.revoke`. Both are wired into `app/api/v1/api-keys` (POST + DELETE) and accepted by the audit-log query filter.
- Two more cases in `tests/unit/route-auth.test.ts` asserting the rate-limit identifier is keyId-derived for bearer and userId-derived for cookie sessions (10 cases total, was 8).

### Changed
- `app/api/v1/audit-log/route.ts`, `app/api/v1/decisions/route.ts` (GET), `app/api/v1/export/route.ts` — rate-limit calls now use the auth-derived identifier instead of a flat `api:${userId}` bucket.
- `lib/data/audit-log.ts` — `AuditAction` extended with the two new strings (no migration needed; column is `VARCHAR(64)`).

### Why this matters
- Per-keyId buckets are a real security improvement: a compromised key can no longer DoS a workspace owner's cookie session.
- Audit hooks on key lifecycle close the most-requested gap from v1.3.30.0 — admins can now see *who issued or revoked which key, when, from which IP* in the same place they read every other workspace mutation.

### Deferred (intentionally)
- Bearer auth on mutation routes (notifications mark-read, decisions PATCH) — each one rolls out in its own PR.
- Per-key scopes (read-only vs read-write).
- A user-facing rate-limit dashboard scoped to keyId.

## [1.3.31.0] - 2026-04-28

**Theme:** Bearer auth rolls out to three more read endpoints. v1.3.30.0 wired `/api/v1/export`; this release adds the `requireWorkspaceAuth` helper so any v1 route can opt into bearer auth in two lines, and applies it to `/api/v1/audit-log`, `/api/v1/decisions` (GET), and `/api/v1/decisions/export-csv`. Behaviour is identical to before for cookie-session callers; bearer callers now succeed where they previously got 401.

### Added
- `lib/utils/route-auth.ts` — `resolveAuth(req)` and `requireWorkspaceAuth(req, workspaceId)`. Bearer first, cookie session fallback. Bearer requests with a mismatched workspaceId return 403 `WORKSPACE_MISMATCH`. Cookie callers run through `verifyWorkspaceMember` as before.
- `tests/unit/route-auth.test.ts` — 9 cases: bearer match, bearer mismatch, cookie member, cookie non-member, both missing, fallback path, etc.

### Changed
- `app/api/v1/audit-log/route.ts` — swapped `safeAuth` + `verifyWorkspaceMember` for `requireWorkspaceAuth`. Plan gate (`audit-log` requires Business+) is unchanged.
- `app/api/v1/decisions/route.ts` — GET handler converted; POST handler intentionally left on cookie-session auth (write paths roll out separately).
- `app/api/v1/decisions/export-csv/route.ts` — inlined membership check replaced with `requireWorkspaceAuth`.

### Why this matters
- The four most-requested machine endpoints (workspace export, audit log, decisions list, decisions CSV) now accept API keys. A CI runner can pull a workspace's compliance audit trail or quality CSV with a Bearer token. Any other v1 route can opt in by adding a `requireWorkspaceAuth` line.

### Deferred (intentionally)
- Mutation routes (`POST/PATCH/DELETE`) — each one rolls out in its own PR with explicit rate-limit + audit-log review.
- Per-key scopes (read-only vs read-write).
- Per-keyId rate-limit buckets so a leaked key can't burn a human user's budget.

## [1.3.30.0] - 2026-04-28

**Theme:** Inbound bearer-token authentication ships. v1.3.29.0 added the issuance UX; this release adds the consumer side — the REST API can now accept `Authorization: Bearer lzx_...` (or `X-Api-Key`) and resolve it to a workspace via the SHA-256 hash stored in `api_keys.key_hash`. The `/api/v1/export` endpoint is the first consumer; it accepts both bearer and cookie-session auth, with bearer requests skipping the membership check (the key itself is the membership grant). Other v1 endpoints can opt into bearer auth one route at a time using the same helper — nothing else has been touched in this PR to keep the blast radius small.

### Added
- `lib/utils/api-key-auth.ts` — `authenticateApiKey(req)` returns `{ workspaceId, userId, keyId }` or `null`. Accepts `Authorization: Bearer <token>` (RFC 6750) and `X-Api-Key`. Rejects Basic/Digest auth schemes. Cheap shape check (`lzx_` prefix + min length) before the SHA-256 hash so garbage tokens never reach the DB. Honours `expires_at` (rejects expired keys). Bumps `last_used_at` fire-and-forget so a stat-tracking write can never slow or fail a successful request. Fails closed on every error mode without leaking which mode tripped (would otherwise be a username-enumeration primitive).
- `tests/unit/api-key-auth.test.ts` — 10 cases: no headers, wrong scheme, wrong prefix, hash miss, Bearer match, X-Api-Key match, expired-key reject, future-expiry accept, db-error fails-closed, lowercase `bearer` accepted.

### Changed
- `app/api/v1/export/route.ts` — first bearer-aware endpoint. Tries bearer first, falls back to cookie session. Bearer requests get their `workspaceId` from the key itself; the query param is still accepted but must match (`WORKSPACE_MISMATCH` 403 otherwise). Membership check is skipped for bearer requests because the key already represents membership.

### Why this matters
- Lazynext now has a real working REST API for machine clients. CI runners, scheduled jobs, and third-party integrations can pull workspace exports with a Bearer token instead of a browser session. The pattern is intentionally additive — every other v1 route still works exactly as before, and any new route can opt in by adding three lines.

### Deferred (intentionally)
- Mass-rolling bearer auth across the rest of v1 — each route gets its own PR so the audit trail stays clean.
- Per-key scopes (read-only vs read-write). Today every key inherits owner access.
- Audit-log entries on key use. The shape exists; wiring is one line per route handler.
- Rate-limit bucket per `keyId` instead of per `userId` so a leaked key can't burn a human user's budget.

## [1.3.29.0] - 2026-04-28

**Theme:** API key issuance ships. Settings → Integrations → API Access is no longer a static `coming soon` placeholder — Enterprise-plan workspaces can now generate, list, and revoke real workspace-scoped API keys end-to-end. Keys follow the standard `lzx_<base64url>` namespace pattern (greppable in logs, GitHub-secret-scanning friendly), are stored as SHA-256 hashes (never recoverable from a DB dump), and the plaintext is shown to the user exactly once at creation time. The route handlers reuse the same plan-gate, rate-limit, and workspace-membership helpers as the rest of the v1 API; revocation is composite-key safe (workspace + id) so a stale id from another workspace can never delete cross-tenant. The middleware that *consumes* keys to authenticate inbound REST traffic is intentionally a follow-up PR — this release ships the issuance UX in isolation so it can be reviewed cleanly.

### Added
- `supabase/migrations/20260428000001_api_keys.sql` — `api_keys` table. Columns: `id`, `workspace_id` (FK + cascade), `user_id` (creator, FK + cascade), `name` (required label), `key_hash` (UNIQUE, the SHA-256 lookup column), `key_prefix` (8-char display affordance), `last_used_at`, `expires_at` (optional self-imposed expiry), `created_at`. RLS enabled, service-role only. Index on `(workspace_id, created_at DESC)` for the Settings list query.
- `lib/data/api-keys.ts` — `mintApiKey` (generates plaintext + hash + prefix), `hashApiKey` (deterministic for inbound auth lookups), `listApiKeys`, `createApiKey`, `deleteApiKey` (composite-key safe). Row shape **deliberately omits `key_hash`** so a Settings render can never accidentally surface the lookup hash.
- `app/api/v1/api-keys/route.ts` — `GET ?workspaceId=<uuid>` lists keys; `POST` mints a new key. Plan-gated to `business`/`enterprise` slugs (Enterprise tier per `lib/utils/plan-gates.ts`). The plaintext is returned in the POST response body **exactly once** — the client surfaces it to the user and discards it.
- `app/api/v1/api-keys/[id]/route.ts` — `DELETE ?workspaceId=<uuid>` revokes a key. UUID shape validation before the DB hit, 404 on no-match.
- `components/ui/ApiKeysPanel.tsx` — client component on the Integrations page. Three states: plan-locked (shows upgrade nudge with `Contact sales` link), unlocked-empty (shows the create form), unlocked-with-keys (form + list + per-row revoke + just-created reveal banner with one-shot `Copy` button). Reveal banner drops the plaintext after the user dismisses it; never persisted client-side.
- `tests/unit/api-keys.test.ts` — 11 cases covering: `lzx_` namespace, 32-byte entropy, sha-256 hash format, prefix relationship, key uniqueness, hash determinism, snake_case→camelCase mapping, the explicit assertion that `key_hash` never leaks into the API response shape, db-error fallback, name trim+truncate, composite-key delete success/no-match/error.

### Changed
- `lib/utils/plan-gates.ts` — added `'api-keys': ['business', 'enterprise']` (Enterprise-tier feature, sits alongside `audit-log` and `sso` in the same trust band).
- `app/(app)/workspace/[slug]/integrations/page.tsx` — the static `Generate API key (coming soon)` block was replaced with `<ApiKeysPanel />`. The badge now reads `Enterprise plan` (was `Business Plan`) to match the actual plan slug requirement.

### Why this matters
- The fourth and final "coming soon" surface inside the app is gone. Settings → Integrations now ships a real, working Enterprise feature instead of a decorative placeholder. Keys are bearer tokens with industry-standard handling: namespace, SHA-256 hash, prefix display, one-shot reveal. The middleware that authenticates inbound traffic with these keys is the obvious next ship.

### Deferred (intentionally)
- Inbound API authentication middleware (validates `Authorization: Bearer lzx_...` against `key_hash`, updates `last_used_at`).
- Per-key scopes (read-only vs read-write). Today every key has implicit owner access.
- Audit-log entries on key creation/revocation. The hooks exist; wiring is one line per route handler.

## [1.3.28.2] - 2026-04-28

**Theme:** Roadmap sync. Three back-to-back ships (v1.3.28.0, v1.3.28.1) landed without updating `docs/project-roadmap.md`. This release re-anchors the roadmap header to v1.3.28.1, updates the *Remaining work* descriptions to reflect what shipped, and adds a Change Log entry. No code changes.

### Changed
- `docs/project-roadmap.md` — milestone bumped to v1.3.28.1; Import Modal + Integrations Settings rows note v1.3.28.0 as their latest; Change Log row added.

## [1.3.28.1] - 2026-04-28

**Theme:** Marketing accuracy patch. The pricing page and the competitor comparison page were both still listing **Automation engine** and **Templates** as `Soon`/`coming soon`, even though the automation engine shipped in v1.3.7.0 (real WHEN/THEN triggers + webhook actions + run history) and the template marketplace shipped in v1.3.8.0 (6-template curated catalog with one-click install). That understates the product to every prospect that visits the pricing or comparison page before signing up.

### Changed
- `app/(marketing)/pricing/page.tsx` — Business tier feature line changed from `Automation engine (coming soon)` to `Automation engine (WHEN/THEN triggers + webhooks)`. Comparison-table row for `Automation engine` flipped from `Soon`/`Soon` (Pro/Business) to `true`/`true`.
- `app/(marketing)/comparison/page.tsx` — `Automation builder` and `Templates` rows flipped from `lazynext: 'soon'` to `lazynext: true`.

### Why this matters
- Before this patch, a prospect comparing Lazynext to Linear or Asana on the comparison page saw both products beat us on automation. After: parity. Same for templates vs Notion. The product already does these things; the page now says so.

## [1.3.28.0] - 2026-04-28

**Theme:** OAuth surfaces become consistent across the app. v1.3.27.0 wired the registry into Settings → Integrations; this release ports the same honest pattern to the Import modal and adds a working Disconnect button to Settings. Both surfaces now read from the same source of truth: tiles show `Available` if env-configured, `Not configured` (with the exact env vars in tooltips) otherwise. The Import modal's `Connect` link reuses the same `/api/v1/oauth/[provider]/start` URL — once any adapter PR lands, both surfaces light up together with no extra wiring. Disconnect uses the existing `DELETE /api/v1/oauth/connections/[id]` route shipped in v1.3.27.0 and `router.refresh()` to re-render the server component.

### Added
- `components/ui/ConnectionTile.tsx` — small client component for the connected-providers list on the Integrations page. Per-row Disconnect button with inline two-step confirm (`Disconnect → Confirm | Cancel`) so a misclick can't drop a working integration. Surfaces API errors inline. Calls `router.refresh()` on success so the deletion re-renders without a full reload.

### Changed
- `components/ui/ImportModal.tsx` — the five OAuth-source tiles (Notion, Linear, Trello, Asana, Notion ZIP) no longer render as decorative `Soon` placeholders. Each tile that maps to an `OAuthProviderId` (notion, linear, trello, asana) now fetches `/api/v1/oauth/connections?workspaceId=<id>` on mount and reflects the real registry state: green `Available` badge + working `Connect →` link if env-configured, otherwise a `Not configured` badge with a tooltip naming `LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_ID` + `_CLIENT_SECRET`. Notion ZIP keeps a `Soon` badge (file upload, not OAuth). Network errors during fetch are non-fatal — tiles fall back to the disabled state, which matches reality.
- `app/(app)/workspace/[slug]/integrations/page.tsx` — connected providers now render via `ConnectionTile` so each row gets a Disconnect action. The page stays a server component; only the new tile is `'use client'`.

### Why this matters
- Two of the three surfaces that previously rendered fake `Soon` tags (Settings → Integrations and the Import modal) now reflect deployment reality, and the third (Profile → Connected Accounts) was already real Supabase identity-provider data. Disconnect closes the read-only loop on Integrations: a workspace owner can now delete a stale connection without a database round-trip.



**Theme:** OAuth scaffolding becomes user-visible. v1.3.26.0 shipped the table + crypto + registry contract; this release wires the read API, the per-provider start route, and rebuilds the Settings → Integrations page on top of all of it. The page now reads real data: every roadmap provider renders with an `Available` badge if its env vars are set or `Not configured` if they aren't, and the disabled-button copy now points at the exact env vars to set instead of the previous "coming soon" placeholder. Connected list reflects real `oauth_connections` rows when they exist (none in production yet). Provider adapters still ship one-by-one in their own PRs — this release does NOT add a working flow for any vendor.

### Added
- `lib/data/oauth-connections.ts` — read + delete data layer. `listOAuthConnections`, `deleteOAuthConnection` (composite-key delete so a stale id from another workspace can't leak), `getProviderConnectionCounts`. **Returns `OAuthConnectionRow` shapes that explicitly omit `encrypted_tokens`** so a Settings render can never accidentally surface a sealed-but-loggable token blob. Decryption stays in the per-adapter callsite that needs to make a provider call.
- `app/api/v1/oauth/connections/route.ts` — `GET ?workspaceId=<uuid>` returns `{ connections: OAuthConnectionRow[], providers: { id, configured }[] }`. `providers` reads from env vars and is independent of DB availability so the dev-without-Supabase path still gets honest configured/not-configured state.
- `app/api/v1/oauth/connections/[id]/route.ts` — `DELETE ?workspaceId=<uuid>` removes the connection (404 on no-match). Validates path-id shape before hitting the DB. Provider-side revocation deferred to per-adapter callsites.
- `app/api/v1/oauth/[provider]/start/route.ts` — reserves the URL space for every roadmap provider with five distinct error shapes: `UNKNOWN_PROVIDER` (404), `MISSING_WORKSPACE_ID` (400), `DATABASE_NOT_CONFIGURED` (503), `FORBIDDEN` (403), `PROVIDER_NOT_CONFIGURED` (503 with the exact env vars to set), `PROVIDER_ADAPTER_NOT_REGISTERED` (501 with `provider_id` for deploy probes), `PROVIDER_FLOW_NOT_IMPLEMENTED` (501). State + PKCE machinery deferred to the first adapter PR.
- `tests/unit/oauth-connections.test.ts` — 9 cases against a Supabase query-builder mock: row mapping (snake_case → camelCase), the explicit assertion that `encrypted_tokens` / `access_token` / `refresh_token` never leak, error-paths return `[]` / `0` / `{}`, count grouping, count-null defensiveness.

### Changed
- `app/(app)/workspace/[slug]/integrations/page.tsx` — converted from client to server component. Reads real `getWorkspaceBySlug` + `verifyWorkspaceMember` + `listOAuthConnections`. New `PROVIDER_COPY: Record<OAuthProviderId, …>` map (compile error if a `KNOWN_PROVIDER_IDS` entry is missing copy). Connected list renders one tile per provider with all its connections grouped beneath; Available list renders the seven roadmap providers with `Available` (env-configured) or `Not configured` badges. The disabled `Notify me` placeholder is gone — disabled tiles now read `Configure to enable` with a tooltip naming `LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_ID` + `_CLIENT_SECRET`. Connect button on configured providers points at `/api/v1/oauth/[provider]/start` so the URL is exercised end-to-end even before any adapter ships.

### Test results
- Type-check: clean. Vitest: **240/240 passing** across 31 files (231 → 240; 9 new in `oauth-connections.test.ts`). Build: clean.

## [1.3.26.0] - 2026-04-27

**Theme:** OAuth scaffolding for the seven Settings → Integrations / Import-Modal providers (Slack, Notion, GitHub, Linear, Trello, Asana, Jira). The roadmap has carried these as honest empty states since v1.0 because each requires a developer-portal app registration with credentials no AI agent can produce. This release ships the *infrastructure* — DB table, AES-256-GCM token sealing, provider registry — so each provider, when its credentials land, is a thin adapter file rather than a full feature build. Zero providers wired in this PR (intentional — see `lib/oauth/registry.ts` header). Public surfaces (Settings → Integrations, Import Modal) are unchanged in this ship; they'll start showing real "Connect" buttons in subsequent per-provider PRs.

### Added
- `supabase/migrations/20260427000006_oauth_connections.sql` — `oauth_connections` table: `(workspace_id, user_id, provider, external_id, encrypted_tokens, scopes, expires_at, …)` with `UNIQUE (workspace_id, provider, external_id)` so re-installing the same Slack workspace updates rather than duplicates. Two indexes: workspace+provider lookup (Settings UI), partial index on `expires_at` (refresh worker). RLS enabled, service-role writes only — defense in depth on top of the encryption.
- `lib/oauth/crypto.ts` — AES-256-GCM token sealing. `sealTokenEnvelope({ access_token, refresh_token?, expires_at? })` → `iv:authTag:ciphertext` triple, all base64url. `openTokenEnvelope` is the inverse and validates shape (rejects payloads missing `access_token`). Key resolved from `OAUTH_TOKEN_ENCRYPTION_KEY` env var (32-byte hex; misconfiguration throws at boot, not at the provider callback). Random IV per call so identical plaintext yields distinct ciphertext.
- `lib/oauth/registry.ts` — `OAuthProviderConfig` adapter contract (`buildAuthorizeUrl`, `exchangeCode`, scopes per `read|write|admin` mode, PKCE flag). `KNOWN_PROVIDER_IDS` allow-list reserves the URL space for all seven providers — unknown ids 404 even before any adapter lands. `isProviderConfigured(id)` checks `LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_ID` + `_CLIENT_SECRET` so the eventual UI can show "Connect" vs "Configure to enable" without lying. Registry ships empty: each provider adapter lands in its own Mastery cycle when credentials are available.
- `tests/unit/oauth-crypto.test.ts` — 14 cases: round-trip, random-IV, base64url segment shape, wrong-key rejection, tampered-ciphertext rejection, malformed-payload rejection, envelope round-trip, minimal-envelope round-trip, `access_token`-missing rejection, key-resolution paths (valid hex, missing env, non-hex, wrong length).
- `tests/unit/oauth-registry.test.ts` — 9 cases: known-id list shape, `isKnownProvider` allow-list, registry-empty assertions for every roadmap id, `isProviderConfigured` truth table (neither set, one set, both set, empty strings).

### Test results
- Type-check: clean. Vitest: **231/231 passing** across 30 files (208 → 231; 23 new across `oauth-crypto.test.ts` + `oauth-registry.test.ts`). Build: clean.

## [1.3.25.0] - 2026-04-27

**Theme:** Sessions tab now labels the current session honestly. The card has read "Current session — Signed in {timestamp}" since v1.0; that's it. Now it parses the request user-agent server-side to also show the browser, OS, and device class — `"Chrome on macOS · Desktop"`, `"Safari on iOS · Mobile"`, etc. — so you can at least confirm the session card describes the device you're sitting at. Per-device session list still isn't shipping (Supabase Auth doesn't expose it without the admin API), and the dashed empty-state below still says so plainly.

### Added
- `lib/utils/user-agent.ts` — small UA parser (no new deps; rejected `ua-parser-js`'s 27kB gzip for a 60-line file). Returns `{ browser, os, device }` with `'Unknown'` fallbacks per field. `formatDeviceLabel` drops `Unknown` segments rather than printing them. Edge is matched before Chrome (Edge UAs include the Chrome token); iPad is classified as Tablet even though iPadOS 13+ advertises as Mac.
- `tests/unit/user-agent.test.ts` — 11 cases: Chrome/macOS, Safari/iPhone Mobile, iPad → Tablet, Edge-before-Chrome priority, Firefox/Linux, all-Unknown for null/empty/malformed UAs, plus four `formatDeviceLabel` shape tests.

### Changed
- `app/(app)/workspace/[slug]/profile/page.tsx` — reads `headers().get('user-agent')` on the server, parses it with `parseUserAgent`, and passes `currentDevice` through to `ProfileClient`. `force-dynamic` was already set so this doesn't break ISR.
- `app/(app)/workspace/[slug]/profile/ProfileClient.tsx` — `Props.initial.currentDevice` added; Sessions card's right side now renders an `Active` badge plus `formatDeviceLabel(currentDevice)` above the existing `Signed in …` line. The dashed "per-device list isn't available" panel below is unchanged — that limitation still holds.

### Test results
- Type-check: clean. Vitest: **208/208 passing** across 28 files (197 → 208; 11 new in `user-agent.test.ts`). Build: clean.

## [1.3.24.0] - 2026-04-27

**Theme:** Two new real blog posts close the "blog ships with one post" honest empty state. v1.3.x has shipped 24+ engineering surfaces (Decision DNA scoring, Workspace Maturity Score, AI quotas, OAuth-ready scaffolding next) but `/blog` was still a one-post listing with a "more coming" placeholder. Wrote two posts grounded in actual code that exists in the repo today:
- `how-decision-dna-scoring-works` — Engineering deep-dive on `lib/ai/decision-scorer.ts`: four orthogonal dimensions, Groq → Together → heuristic provider chain, the `extractJson` step that survives Llama-wrapping-JSON-in-fences, every score stamped with `model_version`, structured `decision_scorer` log events, and the two alerts we run on the call rate.
- `workspace-maturity-score` — Product piece on `lib/wms.ts`: the five WMS events with their real weights (decision_created +2, outcome_recorded +3, teammate_invited +5, decision_public_shared +2, integration_connected +4), the four-layer threshold map (0/15/35/60), the soft sidebar gate vs the hard API-side gate via `isFeatureUnlocked`, and the Power-user override toggle for prospects who want everything immediately.

### Changed
- `app/(marketing)/blog/page.tsx` — `posts` array gains two non-featured entries (Engineering + Product tags). Comment updated: adding a post is a three-step edit (listing + `[slug]/page.tsx` body + `sitemap.ts`).
- `app/(marketing)/blog/[slug]/page.tsx` — added two new `Post` records under their slugs in the `posts` map. Each is full body content (h2 sections, lists, prose, plus a real TypeScript code block on the engineering post). `generateStaticParams` picks them up automatically since it iterates `Object.keys(posts)`.
- `app/sitemap.ts` — `blogPosts` array now lists all three real posts with their actual publish dates so each gets an indexed entry with the right `lastModified`.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.9] - 2026-04-27

**Theme:** Canonical URLs on every public marketing page. Root layout sets `metadataBase` so per-page `alternates.canonical: '/path'` resolves to absolute `https://lazynext.com/path`. Without this, `/contact?topic=enterprise` (and any future tracked-link variants) split SEO authority across query-string variants. Added `alternates.canonical` plus `openGraph.url` to all 11 public marketing pages: `/pricing`, `/about`, `/features`, `/comparison`, `/changelog`, `/blog`, `/contact`, `/careers`, `/docs`, `/privacy`, `/terms`. Sitemap from v1.3.23.8 + canonicals from this ship now form a complete SEO surface.

### Changed
- `app/(marketing)/{pricing,about,features,comparison,changelog,blog}/layout.tsx` — added `alternates: { canonical: '/path' }` and `openGraph.url: '/path'` to each existing metadata block. Both fields resolve against the root `metadataBase`.
- `app/(marketing)/{contact,careers,docs,privacy,terms}/page.tsx` — same additions on the page-level metadata exports (these are server components without a separate layout).

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.8] - 2026-04-27

**Theme:** SEO sitemap closes the gap with reality. `app/sitemap.ts` listed only 7 routes (`/`, `/about`, `/blog`, `/changelog`, `/comparison`, `/features`, `/pricing`) but five real public marketing pages were missing: `/contact`, `/careers`, `/privacy`, `/terms`, `/docs`. The single published blog post (`/blog/launching-lazynext`) wasn't indexed individually — search engines could only find it by crawling `/blog`. Added all five static pages plus the blog post entry with its real publish date.

### Changed
- `app/sitemap.ts` — added `/contact`, `/careers`, `/privacy`, `/terms`, `/docs` to the static surface map. New `blogPosts` array (currently `launching-lazynext` published 2026-04-18) emits per-post entries with `changeFrequency: 'yearly'`. New `HIGH_PRIORITY` lookup gives the homepage priority 1, `/pricing` 0.9, `/features` 0.8, and everything else falls back to 0.7. Blog posts default to 0.6. Comments document the additive contract for future blog posts.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.7] - 2026-04-27

**Theme:** Funnel coverage for Enterprise contact-clicks from BillingClient. The global `UpgradeModal` already fires `paywall.contact.clicked` before routing to `/contact?topic=enterprise`. The in-app billing page Enterprise card routed to the same URL but didn't fire the event — funnel queries undercounted Enterprise interest from the in-app surface, the same parity gap the previous three ships closed for `paywall.gate.shown` / `paywall.checkout.errored` / `paywall.checkout.succeeded`.

### Changed
- `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — per-card click handler now fires `paywall.contact.clicked` (with `plan: 'business' | 'enterprise'`, `surface: 'billing-page'`) before `window.location.href` redirects to `/contact?topic=enterprise`. Same shape as `components/ui/UpgradeModal.tsx`.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.6] - 2026-04-27

**Theme:** Marketing pricing page Enterprise CTA now passes `?topic=enterprise`. v1.3.23.2 made `/contact` topic-aware so the in-app billing page Enterprise card surfaces a tailored Enterprise banner with pre-filled mailto. The marketing `/pricing` Enterprise card was the larger source of Enterprise traffic but still routed to bare `/contact`, missing the banner + pre-filled subject/body. Same one-line fix as the in-app surface.

### Changed
- `app/(marketing)/pricing/page.tsx` — Enterprise tier `ctaLink` changed from `/contact` to `/contact?topic=enterprise` so visitors clicking the marketing Enterprise card land on the same tailored banner the in-app billing page already shows. Routes to the same `TOPICS.enterprise` registry entry from v1.3.23.2.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.5] - 2026-04-27

**Theme:** Marketing pricing page now reads from the same constants as everything else. The landing `PricingSection` already imported `PLAN_PRICING_USD` / `PLAN_PRICING_USD_ANNUAL`, and `BillingClient` was synced in v1.3.23.0, but the `/pricing` route was still hardcoding `'19'`, `'15'`, `'30'`, `'24'` strings — the exact drift pattern that bit `BillingClient` in v1.3.23.0 ($9/$19/$49 mismatch). Closed before it bit again.

### Changed
- `app/(marketing)/pricing/page.tsx` — imports `PLAN_PRICING_USD` + `PLAN_PRICING_USD_ANNUAL` and derives Team/Business `monthlyPrice` + `annualPrice` via `String(PLAN_PRICING_USD.starter)` etc. instead of hardcoded literals. Now a single edit in `lib/utils/constants.ts` propagates to every price surface (BillingClient, landing PricingSection, and the marketing `/pricing` page).

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.4] - 2026-04-27

**Theme:** Funnel coverage for `full-upgrade` modal entry points. Five gated surfaces (node-limit, ai-limit, member-limit, decision-limit, workspace-limit, sso-gate) all emit `paywall.gate.shown` before opening the modal, but the three generic "Upgrade" / "Change plan" buttons that surface the `full-upgrade` variant did not — the modal-open event existed but the upstream gate event didn't, so funnel queries filtering on `paywall.gate.shown` undercounted the `full-upgrade` denominator.

### Changed
- `app/(app)/workspace/[slug]/settings/page.tsx` — both billing-tab buttons (Free → Upgrade, paid → Change plan) now emit `paywall.gate.shown` with `variant: 'full-upgrade'`, `plan`, `surface: 'settings-billing'` before showing the modal.
- `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — top-right "Change Plan" button (added in v1.3.23.1) now emits `paywall.gate.shown` with `variant: 'full-upgrade'`, `plan`, `surface: 'billing-page-header'` before showing the modal.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.3] - 2026-04-27

**Theme:** Funnel parity for the billing-page checkout surface. v1.3.23.1 wired the page's Upgrade buttons but only emitted `paywall.checkout.clicked` — no `errored` or `succeeded` events. The global `UpgradeModal` has emitted all three for months, so any funnel query splitting clicks vs successful redirects vs errors silently double-counted billing-page traffic as click-only. Now both surfaces emit the same three events with `surface: 'billing-page'` so funnel tools can split them.

### Changed
- `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — `handleUpgrade` now emits `paywall.checkout.errored` (with `status` + `message`) on non-200 / missing-URL responses and on network errors, and `paywall.checkout.succeeded` (with `plan` + `interval`) immediately before `window.location.href` redirect. Mirrors `components/ui/UpgradeModal.tsx`'s telemetry shape so funnel queries don't have to special-case the surface.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.2] - 2026-04-27

**Theme:** Closes the second half of v1.3.23.1 — the Enterprise card on the in-app billing page now routes to `/contact?topic=enterprise`, but the contact page didn't read `?topic`, so users landed on the generic page with no signal that we'd registered their interest. Now the contact page is topic-aware: when `?topic=enterprise` is present, it surfaces an Enterprise banner up top with badge, headline, subhead, and a primary `mailto:hello@lazynext.com` button pre-filled with subject `Enterprise plan inquiry` and a body template asking for team size, current tools, must-haves, and timeline.

### Changed
- `app/(marketing)/contact/page.tsx` — reads `searchParams.topic`, looks up a `TOPICS` registry (currently `{ enterprise }`), renders an indigo banner above the standard contact rows when the topic matches. Unknown / missing topic falls through to the existing generic layout (zero behavior change for users not coming from the billing page). Topic registry is a single object so adding `?topic=security`, `?topic=migration`, etc. is a one-line addition.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.1] - 2026-04-27

**Theme:** Hotfix — Billing page Upgrade buttons actually work now. v1.3.23.0 fixed every dollar value but left the buttons broken: top-right "Change Plan" linked to `/workspace/[slug]/upgrade` (404), per-card "Upgrade" buttons had no `onClick` at all (dead pixels). Wired both: "Change Plan" now triggers the global `useUpgradeModal.show('full-upgrade')` modal, per-card buttons POST to `/api/v1/billing/checkout` (Starter / Business) or route to `/contact?topic=enterprise` (Enterprise tier, no Gumroad product). Free tier shows "Free forever" and is intentionally non-interactive.

### Changed
- `app/(app)/workspace/[slug]/billing/page.tsx` — passes `workspaceId` (not just slug) to the client so checkout can be scoped without a round-trip.
- `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — new `handleUpgrade(plan)` helper POSTs `{ plan, interval, workspaceId }` to `/api/v1/billing/checkout` and `window.location.href = body.data.url` on success. Translates UI `'monthly'|'annual'` → server `'monthly'|'yearly'` at the boundary. Per-card button now wires through to `handleUpgrade` for Starter/Pro, `/contact` for Enterprise, no-op for Free. Pending state shows a spinner + "Opening checkout…" copy on the clicked card and disables every other plan card while in flight. Errors from the API render as an inline amber alert below the comparison grid (no toast dependency). "Change Plan" button at the top now calls `useUpgradeModal.getState().show('full-upgrade')` instead of routing to a 404. Telemetry: `paywall.checkout.clicked` fires with `surface: 'billing-page'` so we can distinguish it from the upgrade-modal funnel.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

## [1.3.23.0] - 2026-04-27

**Theme:** In-app billing page synced to PLAN_LIMITS + PLAN_PRICING_USD. Audit found `app/(app)/workspace/[slug]/billing/BillingClient.tsx` had drifted hard from constants: Team card showed `$9` (real: `$19`), Business card showed `$19` (real: `$30`), Enterprise card showed `$49/seat/month` (real: contact-sales / null), Free tier copy listed only 4 limits instead of 6 (missing `1 workspace`, `20 decisions`), Decisions usage row hardcoded `limit: -1` so Free workspaces never saw their `12/20` cap. Fixed by deriving every dollar value from `PLAN_PRICING_USD` and every limit from `PLAN_LIMITS`. Single source of truth now extends to the in-app billing screen the same way it does to the marketing pricing page.

### Changed
- `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — `planMeta` no longer carries `price`; the card pulls `PLAN_PRICING_USD[plan]` at render time. `null` (Enterprise/Business contact-sales sentinel) renders as **Custom** with no period and skips the annual-discount math. Free card features expanded to the full 6-bullet list (`1 workspace`, `3 members`, `5 workflows`, `100 nodes`, `20 decisions`, `20 AI queries/day`). Starter card adds `Unlimited decisions` and reads `100 AI queries/day/seat`. Pro card reads `500 AI queries/day/seat`. Decisions usage row now uses `limits.decisions` so Free workspaces see real progress against the 20-decision cap. Current-plan subtitle handles the three cases (free, paid, custom) explicitly so Enterprise customers no longer see `$null/seat/month`.

### Test results
- Type-check: clean. Vitest: **197/197 passing** across 27 files. Build: clean.

### Notes
- The `Change Plan` button still links to `/workspace/[slug]/upgrade`, a route that doesn't exist (404). Tracking as a follow-up; the Gumroad portal link directly above it is the working path until the in-app upgrade flow lands.

## [1.3.22.1] - 2026-04-27

**Theme:** Hotfix — extend the daily AI quota to `/api/v1/ai/generate` and `/api/v1/ai/analyze`. v1.3.22.0 closed the loophole on the LazyMind chat path but explicitly deferred these two endpoints; left as-is they'd be a future quota-bypass surface the moment any UI code started calling them. Same shape as chat: optional `workspaceId`, when present we verify membership, plan-gate via `checkAiQuota`, return `402 PLAN_LIMIT_REACHED variant=ai-limit` on cap, and call `recordAiUsage` after success. No active UI callers today, so this is preventative — the quota is now consistent across all three AI endpoints.

### Changed
- `app/api/v1/ai/generate/route.ts` — schema accepts optional `workspaceId`; same plan-gate + post-success increment as chat.
- `app/api/v1/ai/analyze/route.ts` — same.

### Test results
- Type-check: clean. Vitest: **197/197 passing** (existing 401/400 tests for these endpoints still hold; `workspaceId` is optional). Build: clean.

## [1.3.22.0] - 2026-04-27

**Theme:** Server-side AI daily quota — the marketing claim becomes the enforced reality. Lazynext has advertised "20 LazyMind AI queries/day" on Free, "100/day/seat" on Starter, "500/day/seat" on Pro, and "unlimited" on Business since v1.0. The actual enforcement until today: a 20-req/min burst cap (`RATE_LIMITS.ai`) plus a client-side counter in `LazyMindPanel` that reset on every page reload. So a Free user could send 20 queries, refresh, send 20 more, refresh, send 20 more — effectively ~28,800/day. The marketing was nominal; the enforcement was theatre. Fixed.

### Added
- `supabase/migrations/20260427000005_ai_usage.sql` — new `ai_usage(user_id, workspace_id, day, count, updated_at)` table with `(user_id, workspace_id, day)` composite primary key, index on the same lookup tuple, RLS enabled (service-role writes only; users never read this table directly).
- `lib/data/ai-usage.ts` — `getDailyAiUsage`, `getWorkspacePlan`, `checkAiQuota`, `recordAiUsage`. Day boundary is UTC. `recordAiUsage` is best-effort and never throws (a failed write produces no answer-blocking error). `checkAiQuota` derives `{ allowed, plan, used, limit }` against `PLAN_LIMITS[plan].aiQueries`.
- `app/api/v1/ai/usage/route.ts` — new `GET /api/v1/ai/usage?workspaceId=…` returns `{ plan, used, limit, remaining }` for the caller's daily count. Powers panel-header badge hydration so it survives page reloads.

### Changed
- `app/api/v1/ai/chat/route.ts` — schema accepts optional `workspaceId`. When present: verifies workspace membership; calls `checkAiQuota`; returns `402 { error: 'PLAN_LIMIT_REACHED', variant: 'ai-limit', used, limit }` when the daily cap is reached; on a successful AI response calls `recordAiUsage` (fire-and-forget) so today's count increments. Calls without `workspaceId` are unchanged — still rate-limited per minute, no per-day enforcement.
- `components/lazymind/LazyMindPanel.tsx` — reads `workspace.id` from the store and sends it on every chat request. On open, hydrates `aiCount` from `/api/v1/ai/usage` so the badge shows the *real* remaining quota across reloads. Handles 402 by syncing the displayed count to the server's authoritative `used`, removing the optimistic user message, and triggering the `ai-limit` upgrade modal with `paywall.gate.shown` telemetry.

### Test results
- Type-check: clean.
- Vitest: **197/197 passing** across 27 files (189 → 197; 8 new assertions in `tests/unit/ai-usage.test.ts` covering empty-row → 0, populated count, fallback plan, Free-at-cap, Free-under-cap, Business unlimited, and the upsert path).
- Build: clean.

### Notes
- `/api/v1/ai/generate` and `/api/v1/ai/analyze` still use only the per-minute burst cap. Those endpoints back lower-volume server-side actions (decision summary, doc draft) that aren't currently surfaced in the user-facing daily quota — deferred to a follow-up so this release stays focused on the LazyMind-chat path that ships end-to-end.
- A read-modify-write race between two simultaneous AI calls from the same user could undercount by 1 (the user uses *fewer* of their quota than recorded, never more) — acceptable given the cost of an atomic SQL increment vs. the upside of a Supabase-portable upsert.

## [1.3.21.0] - 2026-04-27

**Theme:** Real "Create workspace" + workspace-cap enforcement. The "Create workspace" link in the `WorkspaceSelector` dropdown has, since v1.3.4.5, routed users to `/onboarding`. But `/api/v1/onboarding/workspace` had two paths: Path A renamed the user's existing workspace; Path B (backfill) only ran if the user had zero memberships. So clicking "Create workspace" with an existing workspace just *renamed* it — silently destructive. There was no real way to create a second workspace from the UI. This release ships the missing path + enforces the Free `workspaces: 1` cap that was added to PLAN_LIMITS in v1.3.20.0 but not yet wired.

### Added
- `app/api/v1/workspaces/route.ts` — new `POST` handler creates an additional workspace + admin membership for the authenticated user. Plan-gated: counts the caller's admin/owner memberships joined with each workspace's plan; users who own any paid workspace bypass the cap, otherwise the Free 1-workspace limit applies. Returns `402 { error: 'PLAN_LIMIT_REACHED', variant: 'workspace-limit' }` when blocked, `409 SLUG_TAKEN` when the slug collides, `201` with the new workspace on success. Best-effort cleanup deletes the workspace row if the membership insert fails so we never orphan an admin-less workspace. Rate-limited via `RATE_LIMITS.api`.
- `components/layout/WorkspaceSelector.tsx` — "Create workspace" link replaced with a button that opens a new inline `CreateWorkspaceDialog` modal (name + slug fields, auto-slugify from name until the user touches the slug field). On submit it POSTs to `/api/v1/workspaces`, on 402 it triggers the `workspace-limit` upgrade modal with a `paywall.gate.shown` telemetry event, on 409 it surfaces the slug-collision error inline, on 201 it invalidates the cached row list and routes the user into the new workspace. Esc + outside-click dismissal, focus-trap on the name input.

### Test results
- Type-check: clean.
- Vitest: **189/189 passing** across 26 files (187 → 189; 2 new assertions guard the new POST's 401 + 400 paths).
- Build: clean.

### Notes
- The pre-existing `/api/v1/onboarding/workspace` route is kept for first-time onboarding (Path A rename for the trigger-created workspace, Path B backfill for users who somehow lack a membership). Additional-workspace creation is a separate code path now.

## [1.3.20.0] - 2026-04-27

**Theme:** Pricing alignment + decision-limit enforcement. Audit of every pricing surface against `PLAN_LIMITS` turned up six inconsistencies — most importantly that the marketing site advertised `"10 AI queries/day"` and `"Unlimited nodes"` on Free while the code enforced 20 queries and 100 nodes. The product was *more* generous than the marketing said, but the inconsistency itself broke trust. Also: the `decisions` cap on Free was advertised as 20 in three places but never actually enforced — you could log a thousand decisions on Free. Fixed all of it. Marketing copy now matches the code; the code now matches itself across every limit.

### Changed
- `lib/utils/constants.ts` — `PLAN_LIMITS` extended with `decisions` and `workspaces` fields. Free = `{ members: 3, workflows: 5, nodes: 100, aiQueries: 20, decisions: 20, workspaces: 1 }`. All paid tiers (Starter/Pro/Business/Enterprise) = `-1` (unlimited) on the new fields. PLAN_LIMITS is now the single source of truth for every quantity claim on every pricing surface.
- `app/(marketing)/pricing/page.tsx` — Free tier list now reads `'100 nodes'` (was `'Unlimited nodes'`), `'20 LazyMind AI queries/day'` (was `'Basic LazyMind (10 AI queries/day)'`), and adds `'5 workflows'` (was hidden). Comparison table `Nodes` row Free `'Unlimited' → '100'`. Comparison table `LazyMind AI queries` row Free `'10/day' → '20/day'`. New `Workflows` row added (Free `'5'`, all paid `'Unlimited'`). FAQ `'What do I get on the free plan?'` answer rewritten to match: 1 workspace, 3 members, 100 nodes across 5 workflows, 20 decisions, 20 AI queries/day.

### Added
- `lib/utils/plan-gates.ts` — `canCreateDecision(plan, currentCount)` and `canCreateWorkspace(plan, currentCount)` gate functions. Same `limit === -1 || currentCount < limit` shape as the existing gates.
- `app/api/v1/decisions/route.ts` — POST handler now reads the workspace's plan, looks up `PLAN_LIMITS[plan].decisions`, runs a `count: 'exact', head: true` query against `decisions` for the workspace, and returns `402 { error: 'PLAN_LIMIT_REACHED', variant: 'decision-limit' }` when the cap is reached. Free workspaces are now actually capped at 20 logged decisions; paid tiers stay uncapped.
- `app/(app)/workspace/[slug]/decisions/DecisionsClient.tsx` — Log Decision modal now intercepts the 402 response and triggers the `'decision-limit'` upgrade modal via `useUpgradeModal.show()`, with a `paywall.gate.shown` telemetry event for funnel analysis. The user gets a clear next step instead of a generic error.
- `stores/upgrade-modal.store.ts` + `components/ui/UpgradeModal.tsx` — `'decision-limit'` and `'workspace-limit'` variants added to the `UpgradeVariant` / `ModalVariant` unions and to `VARIANT_COPY` (`'Decision log full on Free'`, `'Free is one workspace'`).
- `tests/unit/plan-limits.test.ts` — 12 new assertions: every plan has every limit field, Free is the only capped tier on members/workspaces/decisions/nodes/workflows, AI queries scale tier-by-tier (100 → 500 → unlimited), annual pricing stays at 20% off, all six gate functions return correct booleans at each boundary.

### Test results
- Type-check: clean.
- Vitest: **187/187 passing** across 26 files (175 → 187).
- Build: clean.

### Notes
- `canCreateWorkspace` is defined and tested but not yet wired to an API — workspace creation through onboarding still doesn't enforce the 1-workspace cap on Free. Deferred to a follow-up so this release stays focused on the decision-cap path that ships end-to-end.
- The PricingSection component on the landing page already showed the correct numbers (`100 nodes`, `20 AI queries/day`, `20 decisions`) — the pricing page was the surface drifting.

## [1.3.19.0] - 2026-04-27

**Theme:** Production crawler + auth title fix. Wrote a Playwright crawler that walks the entire public surface of `https://lazynext.com`, captures console errors, failed network requests, broken images, missing alts, duplicate ids, and missing h1s — then fixed the one real issue it surfaced: `/sign-in` and `/sign-up` both rendered the generic `<title>Auth — Lazynext`, indistinguishable in browser tabs and search results.

### Added

- `tests/e2e/prod-crawl.spec.ts` — read-only production crawler. Walks 14 public routes (landing, pricing, about, blog, changelog, comparison, contact, careers, privacy, terms, docs, features, sign-in, sign-up). Filters third-party console noise (favicon, Sentry init, fonts, Cookiebanner). Writes a structured `test-results/crawl-report.json` with status, load time, console errors, failed requests, broken images, alt-less images, duplicate ids, h1 presence, title, meta description. Run with `CRAWL_BASE=<url> npx playwright test tests/e2e/prod-crawl.spec.ts`. Defaults to `https://lazynext.com`.

### Fixed

- `/sign-in` now renders `<title>Sign in — Lazynext`. `/sign-up` now renders `<title>Create your account — Lazynext`. Previously both inherited the parent `(auth)/layout.tsx` metadata which set the literal `Auth — Lazynext` (the leaf pages are client components and can't export `metadata` directly). Fix: added per-segment server `layout.tsx` files under `(auth)/sign-in/` and `(auth)/sign-up/` that export `metadata` with `title.absolute` so the parent layout's new `title.template` doesn't double-suffix the brand. Parent fallback default is now `Sign in — Lazynext` (the most-visited auth page).

### Verification

- Crawler: 14/14 routes status 200. 0 console errors, 0 failed requests, 0 broken images, 0 duplicate ids. All pages have an h1. Average load time ~2.8s.
- Type-check: ✅ clean.
- Test suite: ✅ 175/175 passing across 25 files (the crawler is a dedicated e2e spec, not part of the unit count).
- Production build: ✅ clean.

## [1.3.18.1] - 2026-04-27

**Hotfix:** Sidebar lit up two nav items at once on `/decisions/outcomes`. Active matching used `pathname.startsWith(href)`, so both `/workspace/x/decisions` *and* `/workspace/x/decisions/outcomes` claimed the active styling — "Decisions" highlighted as the parent and "Outcomes" highlighted as the leaf, simultaneously.

### Fixed

- `components/layout/Sidebar.tsx` — active matching now picks the *longest* matching href across the visible nav items and only that one wins. Also requires `pathname.startsWith(`${href}/`)` (with the trailing slash) so `/decisions-archive` would never falsely activate `/decisions`. The bug only surfaced once `/decisions/outcomes` was added as a sibling nav item; the parent-only navigation worked correctly.
- `docs/project-roadmap.md` — header v1.3.18.0 → v1.3.18.1.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 175/175 passing across 25 files.
- Production build: ✅ clean.

## [1.3.18.0] - 2026-04-27

**Theme:** Confirm in-app, not in the OS chrome. Replaces the workflow-delete `window.confirm` with a real branded confirmation modal, plus locks down the new batch-positions endpoint with regression tests.

### Added

- `components/ui/ConfirmModal.tsx` — reusable confirmation modal with Esc-close, backdrop-cancel, autofocused confirm button, and a `variant: 'danger'` painting (rose-600 + AlertTriangle icon) for irreversible actions. Accepts a confirm handler that may be async; shows a spinner while in-flight and disables the button to block double-submits.
- `tests/unit/batch-positions.test.ts` — 7 new unit tests covering the v1.3.15.0 batch positions zod schema: single update, empty array rejection, non-UUID rejection, non-integer rejection, oversized batch (> 200) rejection, 200-entry boundary acceptance, missing field rejection.

### Changed

- `components/canvas/panels/WorkflowPicker.tsx` — delete now opens a `ConfirmModal` (danger variant) instead of `window.confirm`. The delete fetch lives behind the modal's confirm handler, so the spinner shows while the DELETE request is in flight — you no longer wonder whether the click registered.
- `docs/project-roadmap.md` — header v1.3.17.1 → v1.3.18.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ **175/175** passing across 25 files (was 168/24).
- Production build: ✅ clean.

## [1.3.17.1] - 2026-04-27

**Hotfix:** Onboarding tour step 7 was spotlighting the wrong button and overlapping the sidebar. The selector `button[aria-label="Open LazyMind AI assistant"]` matched the bottom-of-sidebar LazyMind button (the first occurrence in the DOM) instead of the prominent top-bar CTA. Spotlight landed bottom-left, then `placement: 'left'` tried to render the tooltip further left, got viewport-clamped, and ended up blanketing the sidebar. Step 8 (Command Palette) was also broken — it targeted `button[aria-label="Open command palette"]`, an aria-label nothing in the codebase actually had.

### Fixed

- `components/layout/TopBar.tsx` — added `data-tour="lazymind-button"` and `data-tour="command-palette"` (plus the missing `aria-label="Open command palette"`) to the two TopBar CTAs so the tour can target them unambiguously.
- `components/ui/WorkspaceTour.tsx` — step 7 now targets `[data-tour="lazymind-button"]` with `placement: 'bottom'` (was `left`, which clamped poorly even when the right element was found). Step 8 now targets `[data-tour="command-palette"]`. Both steps now spotlight the correct top-bar element and render their tooltip below it instead of overlapping the sidebar.
- `docs/project-roadmap.md` — header v1.3.17.0 → v1.3.17.1.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

## [1.3.17.0] - 2026-04-27

**Theme:** Workflow rename + delete + a real modal. v1.3.16.0 shipped a picker that could create new workflows via `window.prompt` (yes, browser-native and ugly). This release replaces that with a proper modal and adds rename + delete affordances directly on each row of the picker.

### Added

- `components/canvas/panels/WorkflowFormModal.tsx` — focused, autofocused, Esc-closable modal used for both create and rename. Backdrop click closes. Submit-on-enter. Trims input. Disables when name is empty or submission is in flight.
- Per-row rename + delete buttons in the workflow picker. Hover or focus to reveal — keeps the resting state clean. Delete asks for `window.confirm` then DELETEs via the existing `/api/v1/workflows/[id]` endpoint. Rename PATCHes the same endpoint and updates the picker's label in-place via `useCanvasStore.setState({ currentWorkflowName })` if you renamed the active workflow.

### Changed

- `components/canvas/panels/WorkflowPicker.tsx` — replaced `window.prompt` with the new modal for create. Picker dropdown widened from `w-72` to `w-80` to accommodate the action buttons. Each row is now a `group` with opacity-0/100 transitions on the action cluster so the resting state looks like a clean list.
- Deleting the active workflow routes back to `/canvas/default`, which falls through to `getOrCreateDefaultWorkflow` — so even nuking the last workflow creates a fresh one instead of crashing the canvas.
- `docs/project-roadmap.md` — header v1.3.16.0 → v1.3.17.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

## [1.3.16.0] - 2026-04-27

**Theme:** Per-workflow URLs and a picker. The canvas is no longer single-workflow — `/workspace/[slug]/canvas/[id]` now hydrates the requested workflow specifically, and a new picker dropdown in the canvas top-left lets you switch between workflows or create new ones without ever leaving the page. The magic word `default` still works in the URL and resolves to the workspace's default workflow, so existing sidebar links keep their behaviour.

### Added

- `components/canvas/panels/WorkflowPicker.tsx` — top-left dropdown listing every workflow in the current workspace with a single-click switch, plus a "+ New workflow" action that POSTs to `/api/v1/workflows` and routes to the new workflow's URL. Lazy-loads the list on first open (no extra request for users who never switch). Click-outside + Escape close. Active workflow gets a brand-coloured check.
- `components/canvas/WorkflowCanvas.tsx` — accepts an optional `workflowIdFromUrl` prop, threaded through to hydration.
- `app/(app)/workspace/[slug]/canvas/[id]/page.tsx` — reads `[id]` from the URL via `useParams` and forwards it to `<WorkflowCanvas>`.

### Changed

- `lib/canvas/use-canvas-hydration.ts` — second optional arg `workflowId`. When `null`, `undefined`, or `'default'`, falls back to the existing `/api/v1/workflows/default` resolution. Otherwise loads that specific workflow via `GET /api/v1/workflows/[id]`. Cache key now includes the workflow id so URL changes re-hydrate correctly. Existing sidebar links to `/canvas/default` still work — the magic word is preserved.
- `docs/project-roadmap.md` — header v1.3.15.0 → v1.3.16.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

## [1.3.15.0] - 2026-04-27

**Theme:** No more dropped position writes. v1.3.14.0's per-node PATCH-on-debounce had a known gap: closing the tab inside the 600ms debounce window dropped the last drag. This release replaces the per-node PATCH cascade with a single batch endpoint and a beacon flush on page teardown — every drag survives, even the one right before you hit ⌘W.

### Added

- `app/api/v1/nodes/positions/route.ts` — `POST /api/v1/nodes/positions` with body `{ updates: [{ id, positionX, positionY }, ...] }`. Validates each id is UUID-shaped, batches up to 200 nodes, runs membership auth once per workspace touched, applies updates row-by-row. Used both for normal debounced writes and for the beacon flush — beacons can only POST, so a per-node PATCH wouldn't work for the close path.

### Changed

- `lib/canvas/use-canvas-position-persist.ts` — replaced per-node PATCH timers with a single shared 600ms timer that coalesces every dirty position into one batch POST. Adds `pagehide` + `beforeunload` handlers that flush pending positions via `navigator.sendBeacon` so closing the tab during a debounce window no longer drops the last drag. Beacons survive page teardown where regular fetch promises get cancelled.
- `docs/project-roadmap.md` — header v1.3.14.0 → v1.3.15.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

### Performance note

For a user dragging 10 nodes around for 5 seconds, this collapses what was previously ~10 separate PATCHes into 1 batch POST per debounce window. The hot path is now also lighter — one timer instead of one-per-node.

## [1.3.14.0] - 2026-04-27

**Theme:** Canvas is fully persistent now. v1.3.13.0 shipped read-hydration + position-drag-persist; this release closes the loop on every other canvas mutation. Creating a node from the toolbar or right-click menu, drawing an edge between two nodes, deleting either via Delete-key — all now POST/DELETE against `/api/v1/nodes` and `/api/v1/edges`. Refresh the page after any of those, and the canvas comes back exactly as you left it. The "per-session scratchpad" comment is gone for good. Scratchpad fallback still works for dev-without-Supabase: when `currentWorkflowId` is null, mutations fabricate client ids exactly like before — no broken UI.

### Added

- `lib/canvas/persist-helpers.ts` — `createNodeOnServer({ type, title, position, data?, status? })` POSTs to `/api/v1/nodes` then adds the server-issued node to the store; `createEdgeOnServer({ source, target })` POSTs to `/api/v1/edges` then adds the row. Both fall back to client-fabricated ids on failure or when no workflow context exists, so the canvas remains usable in scratchpad mode.
- `lib/canvas/use-canvas-delete-persist.ts` — `useCanvasDeletePersist()` hook. Diffs successive node and edge id sets; any UUID-shaped id that disappears triggers `DELETE /api/v1/nodes/[id]` or `DELETE /api/v1/edges?id=[id]`. Skips client-fabricated ids so scratchpad deletes don't 404 the API. Primes the diff on first hydration so the initial population doesn't fire spurious deletes.

### Changed

- `components/canvas/panels/CanvasToolbar.tsx` — `handleAddNode` now calls `createNodeOnServer` instead of `addNode` directly. Plan-gating still runs first.
- `components/canvas/WorkflowCanvas.tsx` — context-menu `onCreateNode` calls `createNodeOnServer`. ReactFlow's `onConnect` is now a custom `handleConnect` that calls `createEdgeOnServer` (replacing the store's bare `addEdge` path that didn't persist). `useCanvasDeletePersist` mounted alongside the existing hydration + position hooks. Stale unused `addNode` and `onConnect` store selectors removed.
- `docs/project-roadmap.md` — header v1.3.13.0 → v1.3.14.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

### Remaining canvas follow-ups

- Flush pending position writes on `beforeunload` (last 600ms could still drop on tab close — small enough to ship without).
- Multi-workflow UI: the URL is still `/canvas/default`. A picker + per-workflow URL (`/canvas/[workflowId]`) is a future item, not blocking for any user flow today.

## [1.3.13.0] - 2026-04-27

**Theme:** Canvas hydrates from the server. The biggest "honest empty state" in the app — `WorkflowCanvas` had been a per-session scratchpad since v1.0, with the `// TODO: server-side persistence` comment hand-waving the gap. This release fixes half of it: the canvas now loads its real nodes and edges from the workspace's default workflow on every mount, and node position drags are persisted via debounced PATCH so layouts survive a page refresh. **Node create/delete and edge create/delete persistence is intentionally deferred to v1.3.14.0** — those callsites currently still fabricate ids and need a coordinated refactor (POST first, then add to store with the server-issued UUID). Also unblocks the v1.3.9.0 share dialog: with a real `currentWorkflowId` in the store, `ShareWorkflowDialog` now wires into the canvas toolbar behind a Share button.

### Added

- `app/api/v1/workflows/default/route.ts` — `GET /api/v1/workflows/default?workspaceId=<uuid>`. Member-gated. Wraps the existing `getOrCreateDefaultWorkflow` helper so the canvas page (whose URL is permanently `/canvas/default`) can resolve the workspace's first workflow id without forcing a UI-level workflow picker.
- `lib/canvas/use-canvas-hydration.ts` — `useCanvasHydration(workspaceId)` hook. Resolves workflow id, then parallel-fetches nodes + edges, normalizes the server shape (`position_x` → `position.x`, etc.), pushes into the canvas store, and stamps `currentWorkflowId` / `currentWorkflowName` / `currentWorkspaceId`. Failures are swallowed honestly — the canvas falls back to scratchpad mode rather than crashing.
- `lib/canvas/use-canvas-position-persist.ts` — `useCanvasPositionPersist()` hook. Watches `nodes` for any UUID-shaped node whose position has drifted, then PATCHes `/api/v1/nodes/[id]` 600ms after the last change. Skips client-fabricated ids (`node-${Date.now()}`) so scratchpad nodes don't 404 the API.

### Changed

- `stores/canvas.store.ts` — adds `currentWorkflowId`, `currentWorkflowName`, `currentWorkspaceId`, `isHydrated`, `setWorkflowContext`, `setHydrated`. Initial values `null` / `false`. Existing scratchpad behavior preserved when no workflow context is set.
- `components/canvas/WorkflowCanvas.tsx` — calls `useCanvasHydration` + `useCanvasPositionPersist`. Stale "TODO: server-side persistence will live behind /api/v1/nodes" comment removed and replaced with an honest description of what does and doesn't persist.
- `components/canvas/panels/CanvasToolbar.tsx` — adds a Share button above the FAB whenever `currentWorkflowId` is non-null. Clicking opens the existing `ShareWorkflowDialog` (importable since v1.3.9.0, finally wired). Hidden when no workflow context — no fake affordance.
- `docs/project-roadmap.md` — header v1.3.12.0 → v1.3.13.0.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files.
- Production build: ✅ clean.

### Known follow-ups (v1.3.14.0)

- Persist node create (toolbar + context menu) — currently still in-memory.
- Persist node delete — currently still in-memory.
- Persist edge create (`onConnect`) and edge delete — currently still in-memory.
- Flush pending position writes on `beforeunload` to avoid losing the last 600ms of drag.

## [1.3.12.0] - 2026-04-27

**Theme:** CSV export for decisions. The Settings → Export page has been JSON-only since v1.0, and v1.3.11.0's exec report could only be saved as PDF. This release adds CSV everywhere decisions are exportable: a Format dropdown on the Decisions Only Export card, plus a CSV button next to "Print / Save as PDF" on the new exec report. CSV opens cleanly in Excel/Sheets, makes spreadsheet-driven analysis trivial, and complements the human-readable PDF and the developer-facing JSON.

### Added

- `lib/utils/decisions-csv.ts` — RFC 4180-ish serializer. Escapes commas, double-quotes (doubled), and newlines per spec. Arrays (`tags`, `stakeholders`, `options_considered`) join with `; ` so they survive a single cell. CRLF line terminators. Stable column order: `id, created_at, made_by, question, resolution, rationale, decision_type, status, outcome, outcome_notes, outcome_tagged_at, quality_score, options_considered, stakeholders, tags, expected_by, is_public`.
- `app/api/v1/decisions/export-csv/route.ts` — `GET /api/v1/decisions/export-csv?workspaceId=<uuid>&range=7|30|90|365`. Member-only. Streams CSV with `content-type: text/csv` + `content-disposition: attachment` so browsers download instead of rendering. Range filter mirrors the exec report.
- `tests/unit/decisions-csv.test.ts` — 4 new tests: empty list emits header only, basic row passes through unescaped, RFC 4180 escaping for commas/quotes/newlines, array-field joining.

### Changed

- `app/(app)/workspace/[slug]/export/page.tsx` — Decisions Only Export now has a Format dropdown (JSON / CSV). CSV path uses `decisionsToCsv` client-side off the existing `/api/v1/export` payload (no extra round-trip).
- `app/(app)/workspace/[slug]/decisions/report/page.tsx` — header gains a CSV download link next to "Print / Save as PDF". Honors the active range filter on the report.
- `docs/project-roadmap.md` — header v1.3.11.0 → v1.3.12.0. (Remaining work table unchanged — all 4 items still OAuth/content blocked.)

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 168/168 passing across 24 files (164 existing + 4 new).
- Production build: ✅ clean.

## [1.3.11.0] - 2026-04-27

**Theme:** Decision DNA executive report. The PDF/exec report was a roadmap backlog item since v1.0 — never built because dropping a heavy server-side PDF library for one report felt like over-engineering. This release skips the dependency entirely: a server-rendered, print-optimized HTML page at `/workspace/[slug]/decisions/report` that the browser's native "Save as PDF" flow turns into a clean, paginated document. Real data, real numbers, no fake charts.

### Added

- `app/(app)/workspace/[slug]/decisions/report/page.tsx` — server component. Resolves workspace via `getCurrentMemberWorkspace`, fetches up to 500 recent decisions via `getRecentDecisions`, applies an optional `?range=7|30|90|365` filter (default: all-time), then computes stats (total, avg quality across scored entries, successful/failed/mixed counts with % of tagged, status breakdown, pending outcomes), top 5 quality decisions, failed-outcome lessons (up to 10), and full log. Inline `@page { margin: 0.6in }` so the printed PDF has consistent margins. `break-inside-avoid` on each decision card so rows don't split across pages.
- `app/(app)/workspace/[slug]/decisions/report/ReportPrintButton.tsx` — minimal client wrapper around `window.print()`. The whole report is server-rendered; this is the only client bundle the page contributes.

### Changed

- `app/(app)/workspace/[slug]/decisions/DecisionsClient.tsx` — header now renders an "Exec report" link next to the "Log Decision" button, routing to the new report page. Stopped underscore-aliasing `workspaceSlug` (it had been `workspaceSlug: _slug` since v1.0; now it's used).
- `docs/project-roadmap.md` — header v1.3.10.0 → v1.3.11.0; dropped Decision DNA PDF/exec report from *Remaining work* (4 items left); fully-wired count 33 → 34; backend-wired bar 87% → 89%.

### Verification

- Type-check: ✅ clean (fixed initial outcome-enum mismatch — schema uses `good`/`bad`/`neutral`/`pending`, not `successful`/`failed`/`mixed`).
- Test suite: ✅ 164/164 passing across 23 files.
- Production build: ✅ clean.

## [1.3.10.0] - 2026-04-27

**Theme:** Multi-workspace switcher is real. The `WorkspaceSelector` in the sidebar has been display-only since v1.3.3.6 (round 15) — a static badge with no dropdown, no "create workspace" affordance, and no way to switch between workspaces a user belongs to. Users with multiple workspace memberships had to type `/workspace/{slug}` URLs by hand. This release ships the dropdown: click the workspace badge, get a lazy-loaded list of every workspace you're a member of (with role tags), click one to route to `/workspace/{slug}`, or hit "Create workspace" to drop into onboarding. Backed by a new authenticated endpoint, `GET /api/v1/workspaces`, that joins `workspace_members` to `workspaces` for the current user. Roadmap *Remaining work* count 6 → 5; fully wired count 32 → 33; backend-wired bar 84% → ~87%.

### Added

- `app/api/v1/workspaces/route.ts` — `GET` returns `Array<{ id, name, slug, plan, logo, role }>` for every workspace the authenticated user is a member of, sorted alphabetically. Used by the sidebar switcher; no caching (`cache: 'no-store'` from the client) so a freshly created workspace appears immediately on the next dropdown open.
- `WorkspaceSelector` dropdown — `aria-haspopup="menu"`, outside-click + Esc dismissal, lazy-loads the list on first open (no upfront round-trip cost), shows role per row, marks the active workspace with a checkmark, includes a "Create workspace" link to `/onboarding`.

### Changed

- `components/layout/WorkspaceSelector.tsx` — replaced the static display-only badge with the real switcher described above. The button now carries `aria-label="Switch workspace (current: {name})"` so screen readers announce its function. Switching is implemented as `router.push('/workspace/{slug}')` — the existing `WorkspaceHydrator` on that route refreshes the Zustand store from the new slug, so no extra wiring is needed.
- `docs/project-roadmap.md` — header v1.3.9.0 → v1.3.10.0; dropped multi-workspace switcher from *Remaining work*; fully-wired 32 → 33; backend-wired bar 84% → 87%.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 164/164 passing across 23 files.
- Production build: ✅ clean.

## [1.3.9.0] - 2026-04-27

**Theme:** Public Shared Canvas is real. The `/shared/[id]` route shipped with v1.0.0 and has rendered "Shared canvas not found / sharing is in development" for every URL ever since (no `share_token` column, no link-issuance flow, no read-only renderer). This release ships all three. Workflows now carry an optional `share_token` UUID that doubles as authorization for anonymous reads — no broad anon RLS policy needed; the public route is the single chokepoint and reads via the service-role admin client filtered by token. Sharing is opt-in per workflow; revoking nulls the token and instantly invalidates every existing public link; regenerating mints a fresh token (also instantly invalidating the old). Public viewer is a read-only ReactFlow canvas (`nodesDraggable=false`, `nodesConnectable=false`, `elementsSelectable=false`), no member identities exposed, no API surface beyond the read. Header shows workspace name + canvas name + description and a "Build your own canvas" CTA. Roadmap fully wired count 31 → 32; backend-wired bar 82% → 84%.

### Added

- `supabase/migrations/20260427000004_workflow_share_token.sql` — adds `workflows.share_token UUID` (nullable) + `workflows.shared_at TIMESTAMPTZ`. Partial unique index `workflows_share_token_idx ON workflows(share_token) WHERE share_token IS NOT NULL` so the public route lookup is O(1) without colliding on multiple-NULL rows.
- `lib/data/shared-canvas.ts` — `getSharedCanvas(token)` helper. UUID-validates the token, then parallel-fetches workflow + workspace + nodes + edges via the service-role admin client. Returns null when no workflow matches (no information leak about what the token "could have been").
- `app/api/v1/workflows/[id]/share/route.ts` — `GET` (current share state for workspace members) + `PATCH` (toggle on/off, regenerate). On enable mints a fresh `crypto.randomUUID()`; on disable nulls both `share_token` and `shared_at`.
- `app/shared/[id]/SharedCanvasViewer.tsx` — read-only ReactFlow client component reusing the existing 7 node types + `WorkflowEdge`. Header strip with workspace + name + description; footer marker.
- `components/canvas/panels/ShareWorkflowDialog.tsx` — generic, importable share dialog: read state, toggle, copy URL, regenerate. Not yet wired into the toolbar (the canvas store doesn't track a current workflow id). Drop the dialog behind a Share button once that hydration lands.
- `tests/unit/shared-canvas.test.ts` — 3 new tests: non-UUID token returns null without DB access, no-match returns null, full hit hydrates workflow + workspace + nodes + edges.

### Changed

- `app/shared/[id]/page.tsx` — replaced the "sharing is in development / honest empty state" stub with a real two-state page: when `getSharedCanvas` returns a hit, render `<SharedCanvasViewer />` with header + read-only flow + footer; otherwise keep the existing "not found / invalid link" panel for revoked tokens and bad URLs.
- `docs/project-roadmap.md` — header v1.3.8.0 → v1.3.9.0, dropped #35 from *Remaining work*, fully-wired 31 → 32, backend-wired bar 82% → 84%.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 164/164 passing across 23 files (161 existing + 3 new).
- Production build: ✅ clean.
- Migration ready to apply alongside the v1.3.4–v1.3.7 migrations.

## [1.3.8.0] - 2026-04-27

**Theme:** Template Marketplace is real. The page that shipped with v1.0.0 has rendered "Templates are in development" with a 5-card "categories planned for launch" preview ever since. This release deletes that placeholder and replaces it with a working catalog: 6 curated starter templates (Product Sprint, Architecture Decision Log, Feature Decision Log, OKR Tracker, Pre-launch Checklist, Client Project) across 4 categories, each shipping with seed nodes + edges + initial task statuses. Click "Install template" → a new `workflows` row is created in the caller's workspace, every seed node is inserted with a fresh UUID, edges are remapped from seed-id → real-uuid, an audit row is written, and the canvas opens. The catalog itself lives in `lib/data/template-catalog.ts` (not a DB seed) so templates ship with the deploy and iterate via PR review, sidestepping cross-workspace RLS. No new tables — reuses the existing `workflows` / `nodes` / `edges` tables. Roadmap fully wired count 30 → 31; backend-wired bar 79% → 82%.

### Added

- `lib/data/template-catalog.ts` — typed `TEMPLATE_CATALOG` array with 6 curated starter templates. Each template has a `category` (engineering/product/agency/operations/startup), `icon` (lucide name), `color`, and self-contained `nodes` + `edges` seeds. Edges reference nodes by local seed id and are remapped at install time. Exports `getTemplate(id)` and `TEMPLATE_CATEGORY_LABELS`.
- `app/api/v1/templates/route.ts` — `GET` returns the catalog summary (id, name, description, category, icon, color, node/edge counts) plus the category list. Auth + rate-limited; touches no DB rows.
- `app/api/v1/templates/install/route.ts` — `POST { templateId, workspaceId }` creates the workflow + nodes (one-by-one to capture UUIDs) + edges (bulk insert, remapped). Uses the service-role admin client behind `verifyWorkspaceMember`. Records a `workflow.install` audit row with template id + name + node count.
- `tests/unit/template-catalog.test.ts` — 4 new tests: every template has nodes + valid category label, every edge points at a real seed-node id, template ids are unique, `getTemplate` round-trips correctly.

### Changed

- `app/(app)/workspace/[slug]/templates/page.tsx` — placeholder ("Templates are in development", 5 fake "planned categories" cards, disabled CTA) replaced with a real client UI: category filter chips with counts, 2-column responsive grid of template cards (icon + category pill + node/edge count + Install button), per-card install state (Loader2 spinner → CheckCircle2 → router push to canvas), 503-aware honest error banner, footer note about the still-pending "Export as template" backlog item.
- `docs/project-roadmap.md` — header v1.3.7.0 → v1.3.8.0, dropped #18 from *Remaining work*, fully-wired 30 → 31, backend-wired bar 79% → 82%.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 161/161 passing across 22 files (157 existing + 4 new in `tests/unit/template-catalog.test.ts`).
- Production build: ✅ clean.
- No migration required — install reuses the existing `workflows` / `nodes` / `edges` tables.

## [1.3.7.0] - 2026-04-27

**Theme:** The Automation Builder is real. The page that shipped with v1.0.0 has rendered "The automations engine is in development" with a `disabled` button and 4 fake preview rules ever since. This release deletes that placeholder and replaces it with a working WHEN/THEN engine. Two narrow trigger types in v1 (`decision.logged`, `task.created`), two narrow action types (`notification.send` with `{{variable}}` template interpolation, `webhook.post` with HTTPS-only + 5s timeout). The engine runs synchronously after the underlying mutation succeeds, writes a row per execution to the existing `automation_runs` table (now keyed on `automation_id`; `node_id` is nullable), and never propagates failures up to the user-facing write. New `automations` table (RLS member-read, service-role-write). Real CRUD UI: list view with WHEN/THEN pills + last 8 runs as colored chips (green for success, red for failed, hover to see error message), per-row enable/disable toggle, delete with confirm, "New automation" dialog with template interpolation hint and HTTPS-only validation. Roadmap fully wired count 29 → 30; backend-wired bar 76% → 79%.

### Added

- `supabase/migrations/20260427000003_automations.sql` — new `automations` table (workspace_id, name, description, trigger_type, trigger_config jsonb, action_type, action_config jsonb, enabled, created_by, timestamps). Partial index on `(workspace_id, trigger_type) WHERE enabled = TRUE` so the engine's lookup is O(matches), not O(workspace). RLS read-for-members + service-role-all. `automation_runs.node_id` dropped NOT NULL and `automation_id` FK column added with cascade.
- `lib/data/automations.ts` — typed engine. Exports `TRIGGER_TYPES` + `ACTION_TYPES` arrays for runtime validation, `AutomationEvent` discriminated union (`DecisionLoggedEvent` | `TaskCreatedEvent`), `runAutomations(event)` evaluator, plus CRUD helpers (`listAutomations`, `createAutomation`, `updateAutomation`, `deleteAutomation`, `listRecentRuns`). Action runner supports `{{variable}}` interpolation from event payload (`question`, `qualityScore`, `decisionType`, `title`, `assignedTo`, etc.). Webhook action enforces `https://` and uses `AbortSignal.timeout(5000)`.
- `app/api/v1/automations/route.ts` — GET (list with optional `?includeRuns=true`) + POST (zod-validated create).
- `app/api/v1/automations/[id]/route.ts` — PATCH (partial update including enable/disable) + DELETE (cascades runs).
- `app/(app)/workspace/[slug]/automations/AutomationsClient.tsx` — full client UI (list, create dialog, recent-runs chips, optimistic toggle/delete).
- `tests/unit/automations.test.ts` — 4 new tests: no-match no-fire, full notification fan-out with interpolation, https-only webhook rejection, error-swallowing on Supabase failure.

### Changed

- `app/api/v1/decisions/route.ts` — POST now calls `runAutomations({ type: 'decision.logged', … })` after the existing notification + audit hooks.
- `app/api/v1/nodes/route.ts` — POST calls `runAutomations({ type: 'task.created', … })` whenever `type === 'task'`.
- `app/(app)/workspace/[slug]/automations/page.tsx` — placeholder ("The automations engine is in development", 4 fake preview rules, disabled button) replaced with `<AutomationsClient />` behind the existing `automation-gate` FeatureGate (Pro+).
- `docs/project-roadmap.md` — header v1.3.6.0 → v1.3.7.0, dropped #17 from *Remaining work*, fully-wired 29 → 30, backend-wired bar 76% → 79%.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 157/157 passing across 21 files (153 existing + 4 new in `tests/unit/automations.test.ts`).
- Production build: ✅ clean.
- Migration ready to apply alongside the v1.3.4.0 + v1.3.5.0 migrations via Supabase Dashboard.

## [1.3.6.0] - 2026-04-27

**Theme:** Real-time multiplayer cursors land on the canvas. The roadmap's marquee feature — "Real-time Collaboration" — has rendered `<CollaborationOverlay collaborators={[]} />` since v1.0.0. This release wires it to actual presence: open the canvas in two browsers signed in to the same workspace and you see each other move. New `useCollaboration` hook subscribes to a Supabase Realtime presence channel keyed on `workspaceId`, broadcasts the local user's cursor in flow coordinates (so the position survives independent pan/zoom on each client), tracks `selectedNodeId` so peer selections light up node rings, and projects incoming peer cursors back to screen coordinates via ReactFlow's `flowToScreenPosition` for direct render. Cursor broadcasts are throttled to ~30 Hz. The hook is mobile-disabled (cursors don't make sense on touch). `CollaborationOverlay` now uses `position: fixed` for cursor layers (clientX/Y is viewport-relative), keeping the existing pill + name + typing animation. `WorkflowCanvas` is now wrapped in `<ReactFlowProvider>` so the hook can call `useReactFlow()` from outside the `<ReactFlow>` tree. Color is picked deterministically from the user id hash across the existing 6-color palette.

### Added

- `lib/realtime/use-collaboration.ts` — typed React hook returning `PresentCollaborator[]` (every workspace peer except self). Wraps `supabase.channel('presence:workspace:{id}')`, throttles cursor broadcasts via `performance.now()`, re-tracks on selection/typing changes without resubscribing, hashes user id → color, and converts flow ↔ screen coords. Cleans up channel on unmount.

### Changed

- `components/canvas/WorkflowCanvas.tsx` — split into outer `WorkflowCanvas` (provides `<ReactFlowProvider>`) and inner `WorkflowCanvasInner`. The inner component reads `workspace.id` and the active selection from the existing canvas store, calls `useCollaboration`, and passes the live `collaborators` array to `<CollaborationOverlay />` instead of the empty placeholder.
- `components/canvas/CollaborationOverlay.tsx` — peer cursor layer switched from `absolute` + `left/top` to `fixed` + `transform: translate(x, y)` to align with the viewport-relative coordinates the hook now publishes. The presence counter (top-right avatars), node selection rings, and typing dots are unchanged.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 153/153 passing across 20 files (no test changes — the hook is exercised by the live channel only; integration smoke is manual via two browser windows).
- Production build: ✅ clean.
- No new tables, no migration. Uses Supabase Realtime presence (no extra row writes, no extra cost).

## [1.3.5.0] - 2026-04-27

**Theme:** Two more features off the *Remaining work* list — Settings → Notifications and Activity → Audit Log are real. v1.3.4.0 shipped the `notifications` table; this release adds the `notification_preferences` table that lets each user mute specific event types per workspace (the in-app delivery path now consults preferences before inserting a notification row), plus the `audit_log` table that records workspace, decision, and node mutations with actor + IP + user-agent + JSON metadata. Settings → Notifications tab is rewritten as a real client component (`NotificationsTab.tsx`) that fetches every user's 7-row preference matrix on mount and bulk-PATCHes changes — email toggles are visible but disabled until SMTP delivery ships (honest hint shown). Activity → Audit Log replaces its static "Enterprise feature" placeholder with a live `AuditPanel`: Business+ workspaces see the real cursor-paginated log (Actor / Action / Timestamp / IP / User-Agent), Free/Starter workspaces see an upgrade CTA. Audit writes are wired into `PATCH /api/v1/workspace/[slug]` (workspace.update with diff metadata), `POST /api/v1/decisions` (decision.create with question + qualityScore), `POST /api/v1/nodes` (node.create with type + title), `PATCH /api/v1/nodes/[id]` (node.update with changed-keys list), and `DELETE /api/v1/nodes/[id]` (node.delete). Workspace deletion deliberately does not write an audit row because the cascade FK would orphan it post-hoc — the absence of subsequent rows is itself the deletion signal. Plan-gating uses the existing `hasFeature(plan, 'audit-log')` helper which already returns true only for Business + Enterprise. All audit inserts are best-effort: a failed audit write never 500s the underlying mutation.

### Added

- `supabase/migrations/20260427000002_notification_prefs_and_audit_log.sql` — two new tables. `notification_preferences (workspace_id, user_id, type, in_app, email, updated_at)` with `UNIQUE(workspace_id, user_id, type)` for upsert-by-event, RLS for read-own + upsert-own. `audit_log (workspace_id, actor_id, action, resource_type, resource_id, metadata jsonb, ip inet, user_agent text, created_at)` with member-read RLS (tenant isolation) + service-role-only inserts; index on `(workspace_id, created_at desc)`.
- `lib/data/notification-preferences.ts` — `NOTIFICATION_TYPES` array + `NOTIFICATION_TYPE_LABELS` record, `getPreferences` (default-merges to one row per type with `{in_app: true, email: false}`), `upsertPreference` (onConflict `'workspace_id,user_id,type'`).
- `lib/data/audit-log.ts` — `AuditAction` union (11 values across workspace/decision/node/member), `recordAudit` (extracts IP from `x-forwarded-for` first hop or `x-real-ip`, user-agent from headers; never throws), `listAuditLog` (cursor pagination by `created_at`, hydrates actor via `db.auth.admin.listUsers`, optional action filter).
- `app/api/v1/notification-preferences/route.ts` — GET (returns 7-row default-merged list) + PATCH (zod array of `{type, in_app?, email?}`, loops upserts, returns fresh prefs).
- `app/api/v1/audit-log/route.ts` — GET with workspaceId required, plan gate → 402 PLAN_GATE for Free/Starter; supports `cursor`, `action`, `limit` (1–200, clamped).
- `app/(app)/workspace/[slug]/settings/NotificationsTab.tsx` — real client tab with per-event in-app + email toggles, bulk-save, "Saved." confirmation, 503-aware honest amber error banner.
- `tests/unit/notification-preferences.test.ts` — 3 new tests: upsert payload shape + onConflict key, email-default-false, default-merged getPreferences.
- `tests/unit/audit-log.test.ts` — 3 new tests: full payload with IP + UA extraction, never-throws on Supabase error, null-IP/UA when no forwarded headers.

### Changed

- `lib/data/notifications.ts` — `createNotification` and `notifyWorkspaceMembers` now consult `notification_preferences.in_app` and skip recipients who muted the type. The lookup is wrapped in a duck-typed try/catch so existing test mocks (which only stub `from(...).insert(...)`) keep passing.
- `app/api/v1/workspace/[slug]/route.ts` — PATCH writes a `workspace.update` audit row with `{changes, previous}` diff metadata.
- `app/api/v1/decisions/route.ts` — POST writes a `decision.create` audit row alongside the existing `decision_logged` notification.
- `app/api/v1/nodes/route.ts` — POST writes a `node.create` audit row.
- `app/api/v1/nodes/[id]/route.ts` — PATCH writes a `node.update` audit row with the list of changed keys; DELETE writes a `node.delete` row before cascade.
- `app/(app)/workspace/[slug]/settings/page.tsx` — Notifications tab now renders `<NotificationsTab workspaceId={…} />` instead of the "ships once table lands" empty state.
- `app/(app)/workspace/[slug]/activity/page.tsx` + `ActivityClient.tsx` — pass `workspaceId` and `workspacePlan` through; replace static Audit Log placeholder with `AuditPanel` (cursor-paginated grid with Loader2 spinner, plan-gated upgrade CTA for non-Business workspaces).
- `docs/project-roadmap.md` — header bumped to v1.3.5.0; dropped Notification Center, Settings → Notifications tab, and Activity → Audit Log from the *Remaining work* table; "Fully wired" count 25 → 28; backend-wired bar 66% → 74%; feature #12 and #38 status notes refreshed.

### Verification

- Type-check: ✅ clean.
- Test suite: ✅ 153/153 passing across 20 files (was 147/147, added 6 new tests).
- Production build: ✅ clean (only the pre-existing `<img>` warning in `global-error.tsx`, unrelated to this release).
- Migration: ready to apply via Supabase Dashboard alongside `20260427000001_notifications.sql`.

## [1.3.4.0] - 2026-04-27

**Theme:** First feature off the *Remaining work* list — the bell is now real. After 17 demo-data eradication rounds (v1.3.2.0 → v1.3.3.6) replaced fabricated fixtures with honest empty states, the Notification Center had been sitting on `const notifications: Notification[] = []` with the comment *"No notifications table exists in the current schema. Until one ships, this list is intentionally empty."* This release ships the table and the wires. New `notifications` table (Postgres enum `notification_type` covering 7 event types, RLS scoped so users can only read/update their own rows, inserts gated to the service role). New `lib/data/notifications.ts` with `createNotification`, `notifyWorkspaceMembers` (fan-out to every member except the actor), `listNotifications` (hydrates actor name/email/avatar from auth.users via the admin API), `markNotificationRead`, `markAllNotificationsRead`. New API surface: `GET /api/v1/notifications?workspaceId=…`, `PATCH /api/v1/notifications` for mark-all-read, `PATCH /api/v1/notifications/[id]` for single mark-read — all RLS-checked + rate-limited. Two real event hooks wired: `POST /api/v1/decisions` now fans out a `decision_logged` notification to every workspace member except the actor (with a deep link to the decision page); `POST /api/v1/nodes` and `PATCH /api/v1/nodes/[id]` now insert a `task_assigned` notification when a task's `assignedTo` parses as a UUID matching a workspace member (treated honestly: the column is free-form `VARCHAR(255)` and assignment-by-email/name is silently skipped instead of fabricating a recipient). `NotificationCenter` rewired: fetches real data on open, polls every 60s while a workspace is hydrated, optimistic mark-read with server reconciliation, click-through follows the stored deep link and marks read. Notification rows render real actor initials (from `full_name` or `email`), real relative timestamps (`just now` / `Nm ago` / `Nh ago` / `Nd ago` / locale date), grouped Today / Yesterday / Earlier. Self-actions are suppressed (you don't notify yourself). Notification failures never block the underlying mutation — logging a decision succeeds even if the bell-row insert fails, by design.

### Added

- `supabase/migrations/20260427000001_notifications.sql` — `notifications` table with `notification_type` enum (task_assigned / task_due_soon / decision_logged / decision_outcome_pending / thread_mention / thread_reply / workspace_invite), recipient + actor + workspace FKs, optional related-row columns (`related_node_id`, `related_decision_id`, `related_thread_id`), `read_at` timestamp, two indexes (`user_id, read_at, created_at desc` for the bell query, `workspace_id, user_id, created_at desc` for per-workspace listing), three RLS policies (read-own, update-own, insert-service-role).
- `lib/data/notifications.ts` — typed helpers: `createNotification` (single, never-throws, self-notify suppressed), `notifyWorkspaceMembers` (fan-out, actor excluded), `listNotifications` (joins actor metadata via `db.auth.admin.listUsers`), `markNotificationRead`, `markAllNotificationsRead`. Public `NotificationView` type embeds the actor projection used by the UI.
- `app/api/v1/notifications/route.ts` — GET (rate-limited, RLS-scoped, returns up to 100 rows newest-first) + PATCH `mark_all_read` action.
- `app/api/v1/notifications/[id]/route.ts` — PATCH single mark-read with UUID validation.
- `tests/unit/notifications.test.ts` — 4 new unit tests covering self-notify suppression, payload normalization, error swallowing, and null-actor system events.

### Changed

- `app/api/v1/decisions/route.ts` — POST now calls `notifyWorkspaceMembers` after a successful insert, building a deep link from the workspace slug + decision id.
- `app/api/v1/nodes/route.ts` — POST now calls `createNotification` when the new task's `assignedTo` is a UUID matching a workspace member.
- `app/api/v1/nodes/[id]/route.ts` — PATCH now fires the same notification on a real reassignment (assignedTo changed AND not equal to the prior value AND member exists).
- `components/ui/NotificationCenter.tsx` — replaced the empty hardcoded array with real data: `useWorkspaceStore` provides `workspace.id`, fetch wired to the new endpoints, optimistic UI with server reconciliation, link-click marks-read and closes the dropdown, 60s background poll, three error/empty/loading states. Real relative-time formatter and Today / Yesterday / Earlier grouping.
- `docs/project-roadmap.md` — header synced from v1.3.1.1 → v1.3.4.0, replaced "38 Complete" claim with honest "25 fully wired / 13 partial" split + a *Remaining work* table listing every feature that ships as an honest empty state. Marked features 15, 17, 18, 23, 27, 31, 35, 38 as 🟡 partial.

### Verification

- Type-check clean.
- Test suite: **147/147** passing (143 existing + 4 new).
- Production build clean.

## [1.3.3.6] - 2026-04-26

**Theme:** Demo-data eradication, round 17 — two leftover lies. (1) Pulse Dashboard's bottom card was titled **"LazyMind Weekly Summary"** with a `Sparkles` brand-icon, suggesting an AI-generated narrative. The text was actually produced by a deterministic `buildSummary()` helper that concatenates pre-formatted sentences from real stat numbers — useful and honest data, but the framing mislabeled it as AI output. Renamed the card to "This week, in one paragraph", swapped the `Sparkles` icon for `Activity`, dropped the cyan gradient that visually echoed the AI-feature surfaces elsewhere, and added a footnote: *"Computed deterministically from this workspace's actual decisions, tasks, and threads — not AI-generated."* (2) The post-onboarding `WorkspaceTour` had a step that targeted `[aria-label="Switch workspace"]` — an element that no longer exists since round 15 converted `WorkspaceSelector` to a display-only `<div>` with `aria-label="Current workspace: ..."`. Worse, the step copy ("Switch between workspaces or create new ones. Each workspace has its own canvas, members, and settings.") promised a multi-workspace switcher dropdown that doesn't ship. Result: new users got step 3 of 10 with no spotlight and a description for a feature they couldn't find. Removed the step.

### Changed

- **Pulse Dashboard:** Renamed the bottom narrative card from "LazyMind Weekly Summary" to "This week, in one paragraph". Removed the `Sparkles` icon and cyan-gradient background to drop the AI framing. Added a one-line footnote calling out that the summary is deterministically computed, not AI-generated.

### Removed

- **WorkspaceTour:** Dropped the broken "Switch workspace" tour step. The selector pointed at a non-existent element and the description advertised a multi-workspace switcher that doesn't ship. Tour now runs 9 steps instead of 10.

### Verified

- Type-check clean.
- Test suite: **143/143** passing.
- Production build: clean.

---

## [1.3.3.5] - 2026-04-26

**Theme:** Demo-data eradication, round 16 — the biggest fake yet. The **LazyMind AI panel** advertised itself as "Powered by Llama 3.3 70B via Groq" in the footer and rendered a fully-staged 4-message conversation showing fabricated AI responses about a "Q2 Sprint" with hardcoded counts (12 tasks, 5 in progress, 4 decisions, 78/100 health) and a fake "Weekly Digest" with invented progress numbers. When the user actually typed a question, `sendMessage` ran a 1500ms `setTimeout` and returned a hardcoded canned response: "Based on the current workflow state, here are insights and recommended actions" with three fixed bullet points — the AI was never called. The infrastructure (`lib/ai/lazymind.ts`) was already wired with a real Groq+Together fallback and existed for `/api/v1/ai/analyze` and `/api/v1/ai/generate` (decision scoring, content generation), but the chat panel had no endpoint to call. So a hero feature heavily marketed across the site was a UI mock running on `setTimeout`. Fixed by building a real chat endpoint and wiring the panel to it. When neither AI key is configured, the endpoint returns 503 `AI_NOT_CONFIGURED` and the panel shows an honest amber system note instead of pretending the response succeeded.

### Added

- `app/api/v1/ai/chat/route.ts` — new POST endpoint backing the LazyMind panel. Auths via `safeAuth`, rate-limits through `RATE_LIMITS.ai`, calls `callLazyMind` with a chat-specific system prompt (instructs the model not to invent workspace stats, to keep answers concise, to suggest the user paste in specifics rather than fabricate them). Returns `{ data: { content, provider }, error: null }` on success, 503 `AI_NOT_CONFIGURED` when keys aren't set, 502 `AI_ERROR` with the upstream message on Groq/Together failure, 429 on rate-limit. Validates the body with zod (`message: string min 1 max 2000`).

### Changed

- `components/lazymind/LazyMindPanel.tsx` — removed the staged 4-message demo (welcome only now). Removed the `setTimeout`-based fake response handler. Removed the structured-response render branches (`statusSummary`, `observations`, `digest`) — they were only ever populated from the demo fixture; the real backend returns plain markdown text. Wired `sendMessage` to fetch `/api/v1/ai/chat` with proper error handling: 503 `AI_NOT_CONFIGURED` and other errors render as `role: 'system'` amber notes rather than masquerading as AI responses. Quick action buttons rewritten to ask generic questions about Lazynext (Decision DNA scoring, when to log, outcomes vs status) rather than promising "Analyze our Q2 sprint" with no data access. Removed the dead "Send as email digest" button. `aiCount` now only increments on successful real responses (was incrementing on every `setTimeout` fake). Removed unused `Mail`, `TrendingUp`, `CheckCircle` lucide imports and the now-unused `aiTimerRef`.

### Verification

- Type-check clean.
- 143/143 tests passing.
- Production build clean.

## [1.3.3.4] - 2026-04-26

**Theme:** Demo-data eradication, round 15 — the persistent app shell, continued. Round 14 caught the TopBar; the Sidebar had an identical pattern. A "Workflows" section with three hardcoded entries (**Q2 Product Sprint** marked active, **Client Onboarding**, **Bug Triage**) rendered in the sidebar of every workspace regardless of contents. There is no "workflow" primitive in the schema — these were decoration that suggested a feature the product doesn't have. Below them, a "+ New Workflow" button with no `onClick`. Then in the bottom-of-sidebar action stack, the "LazyMind AI" button itself had no `onClick` (the actual LazyMind toggle only fired from `TopBar`, which renders `lg:flex` — so on tablet widths the only LazyMind entry point in the chrome was a dead button). Finally, `WorkspaceSelector` rendered as a `<button>` with a `ChevronDown` icon, hinting at a multi-workspace switcher dropdown — there is no switcher modal in the codebase and no `/workspaces` route to navigate to.

### Changed

- `components/layout/Sidebar.tsx` — removed the entire `workflows` const + the "Workflows" sidebar section + the "+ New Workflow" dead button. Wired the bottom "LazyMind AI" button to `toggleLazyMind` from `useUIStore` so it actually opens the LazyMind panel. Inline comment marks the workflows removal so the next person doesn't reinstate them.
- `components/layout/WorkspaceSelector.tsx` — converted from a `<button>` with a `ChevronDown` to a display-only `<div>`. Avatar and workspace name still render from the hydrated `useWorkspaceStore`. Until a real switcher ships, the chrome no longer lies about its interactivity. Removed the unused `ChevronDown` lucide import.

### Verification

- Type-check clean.
- 143/143 tests passing.
- Production build clean.

## [1.3.3.3] - 2026-04-26

**Theme:** Demo-data eradication, round 14 — the persistent app shell. Every signed-in user, regardless of which workspace they were viewing, saw a `TopBar` with hardcoded text: workspace breadcrumb pinned to **"Acme Corp"** and a workflow sub-segment pinned to **"Q2 Product Sprint"**. There is no "named workflow" primitive in the schema — the second segment was pure decoration that suggested a feature the product doesn't have. To the right of the breadcrumb, three avatar circles labeled **AP / PK / JR** rendered as a "Team members online" presence cluster, identical in spirit to the fake-team fixtures we caught on the landing page (round 5) and the about page (round 12) — except this one rendered constantly, on every page, in the chrome that frames the entire authenticated product. Two more shell buttons did nothing: **"New Workflow"** (no `onClick`, no concept of workflows) and **"Share"** (no `onClick`, no `ShareModal` defined anywhere — verified by grepping the codebase for `ShareModal`, `toggleShare`, `isShareOpen`: zero results). Anyone evaluating the product saw a fully-staffed Acme Corp workspace with a working share button — none of which existed. Fixed by reading the real workspace name from `useWorkspaceStore` (already hydrated by `WorkspaceHydrator` at the `(app)` shell layer) and removing the fake presence cluster + dead buttons entirely.

### Changed

- `components/layout/TopBar.tsx` — replaced the hardcoded `Acme Corp` / `Q2 Product Sprint` breadcrumb with `workspace?.name ?? 'Workspace'` from `useWorkspaceStore`. Removed the workflow sub-segment, the `ChevronDown` decorations on both segments, and the workspace-switcher click handler shell (no switcher route exists at `/workspaces` — verified absent). Removed the `presenceAvatars` const and the entire `Team members online` strip — no presence channel ships today; this matches `CollaborationOverlay collaborators={[]}` already wired into the canvas. Removed the dead `New Workflow` button and the dead `Share` button — both had no `onClick` handler. Trimmed the now-unused `Plus`, `Share2`, `ChevronDown` lucide imports and the `cn` helper. Inline header comment documents all three removals so the next person doesn't reinstate them as "design polish."

### Verification

- Type-check clean (the unused imports would have failed `noUnusedLocals` if left behind).
- 143/143 tests passing.
- Production build clean.

## [1.3.3.2] - 2026-04-26

**Theme:** Demo-data eradication, round 13 — in-app onboarding guide and notification center. The `/workspace/[slug]/guide` page advertised a six-section walkthrough with two sections that didn't reflect what ships: a **Collaboration** section listing real-time presence, in-context thread conversations, and @mentions — none of which work today (canvas renders `CollaborationOverlay collaborators={[]}` with no presence channel; the @mentions dropdown was a hardcoded fixture removed in round 2; the thread-node "in-context conversation" panel was replaced with an honest empty state in round 2 because the conversations were fabricated). And a **Productivity** section listing Automations alongside the (real) command palette and (real) keyboard shortcuts — the rule builder/runtime ships in a future release; the page is currently an empty state. Meanwhile the `NotificationCenter` dropdown still rendered a "View all notifications" link in its footer with no `onClick` handler and no `/notifications` route to navigate to (verified — `app/(app)/workspace/[slug]/notifications/page.tsx` does not exist), and a "Mark all read" button that was always visible even when the list was empty (the array is hardcoded `[]` until a `notifications` table ships). Fixed without touching the 40 i18n locale files — orphaned translation keys are harmless.

### Changed

- `app/(app)/workspace/[slug]/guide/page.tsx` — removed the entire `collaboration` section from `guideSections`. Removed the `automations` feature entry from the `productivity` section's `features` array. Removed the now-unused `Users` import. Inline comments mark both removals with the reason. The section count drops from 6 to 5 — the progress bar denominator is computed from `guideSections.length`, so progress percentages stay accurate.
- `components/ui/NotificationCenter.tsx` — removed the dead "View all notifications" footer button. Wrapped the "Mark all read" button in `unreadCount > 0` so it doesn't render on the empty state. The bell dropdown is now the full notification surface; nothing pretends to link elsewhere.

### Verification

- Type-check clean (the unused `Users` import would have failed `noUnusedLocals` if left behind).
- 143/143 tests passing.
- Production build clean.

## [1.3.3.1] - 2026-04-26

**Theme:** Demo-data eradication, round 12 — three more public-marketing pages telling stories that didn't match the product. **About** rendered a fabricated three-person team ("Avas Patel · Founder & CEO", "Priya Shah · Head of Design", "Rahul Dev · Lead Engineer") with colored-circle avatars and titles, when Lazynext is currently a one-founder operation. Same fake-social-proof pattern caught on the landing page in round 5 — invented teammates render alongside the real founder so a prospect can't tell which name is real. **Features** described the Pulse Dashboard as "Real-time health metrics" with "burndown charts" (refreshes on page load, no streaming; the burndown chart was replaced with an honest empty state in round 2's pulse refactor) and described Automations with two concrete WHEN/THEN examples ("when a task completes, notify the team", "when a decision is made, log it to Slack") even though the automations page is currently an honest empty state with no rule builder and no runtime. **Pricing** sold four features that don't ship as written: the Team plan promised "Import from Notion / Linear / Trello" (only the CSV path of `/api/v1/import` is wired — the OAuth connectors return a fake `jobId` and no work happens, per the round 9 audit); the Business plan listed "Automation engine" (empty-state page), "Custom templates" (no `templates` table, empty-state page), and "Data export (JSON / CSV / PDF)" (the export endpoint only emits JSON). The comparison table at the bottom of the pricing page repeated the same lies in matrix form. All three pages corrected to match what actually ships in v1.3.3.1.

### Changed

- `app/(marketing)/about/page.tsx` — removed the `team` array and the entire 3-avatar team grid. Replaced with an honest one-founder note ("Lazynext is a one-founder operation today. No simulated org chart, no stock-photo headshots. Every line of code, every design decision, every email reply is the same person.") and a single Avas Patel · Founder pill. Converted from `'use client'` to a server component (no client interactivity).
- `app/(marketing)/features/page.tsx` — added an `inDevelopment?: true` flag to the `Feature` interface; rows so flagged render a "in development" pill next to the title. Automations is now flagged. Pulse copy rewritten to drop the misleading "Real-time" framing ("Refreshes on page load (live streaming is on the roadmap)"). 7-Node-Primitives copy now distinguishes which node types ship today (Tasks / Docs / Decisions / Threads) vs progressively rolling out. Hero subhead changed to "What ships today, honestly" + lead copy explaining the clock badge. Indigo → brand lime per the design system. CTA banner switched from `bg-indigo-600` to `bg-slate-900` with a `bg-brand` button (matches the comparison page from round 11). Converted from `'use client'` to a server component (no client interactivity).
- `app/(marketing)/pricing/page.tsx` — Team plan: `Import from Notion / Linear / Trello` → `CSV import (Notion / Linear / Trello connectors soon)`. Business plan: `Automation engine` → `Automation engine (coming soon)`; removed `Custom templates`; `Data export (JSON / CSV / PDF)` → `Workspace JSON export`. Comparison table: `Templates` row removed entirely; `Automation` row renamed `Automation engine` and Pro/Business cells set to `'Soon'`; `Import` cells now show `'CSV'` instead of a checkmark; `Export` cells show `'JSON'` instead of `'JSON / CSV / PDF'`.

### Verification

- Type-check clean.
- 143/143 tests passing.
- Production build clean.

## [1.3.3.0] - 2026-04-26

**Theme:** Demo-data eradication, round 11 — public-marketing surfaces. Two of the three pages a prospect visits before signing up were lying to them. The Comparison page (`/comparison`) claimed Lazynext shipped four features it doesn't: **Real-time collaboration** (`CollaborationOverlay` is rendered today with a hardcoded `collaborators={[]}` — there is no presence channel, no cursor sync, no broadcast layer), **Template marketplace** (the templates page is an honest empty state, no `templates` table exists), **Automation builder** (the automations page is also an empty state), and **Global pricing** (a marketing claim, not a comparable feature). Every row showed a green check for Lazynext regardless of reality. The Marketing Changelog page (`/changelog`) was even more directly stale: a hardcoded `entries` array pinned **v1.0.0.0** with the **"Latest"** ribbon while the actual production version was **v1.3.2.9** — every prospect visiting the page saw a release from over twenty rounds ago marketed as the newest thing. Both fixed honestly.

### Changed

- `app/(marketing)/comparison/page.tsx` — rewrote the comparison table to reflect what actually ships in v1.3.2.9. Added a fourth cell state, `'soon'` (clock icon), distinct from `false` (X) and `'partial'` (dash). Lazynext is marked `'soon'` on Automation builder and Templates (schema/node-types exist, UI/engine ship later) and the Real-time collaboration / Template marketplace / Global pricing rows were removed entirely. Three new rows added that highlight what Lazynext actually does that competitors don't: AI quality scoring, outcome reminder loop, public decision pages (`/d/[slug]`). Each row now carries a one-line "why this matters" caption under the feature name. Footer legend explains the four cell states. Honest-startup note explains what "in development" means and links to the live changelog. Switched indigo → brand lime per `docs/design-system.md`. Converted from a `'use client'` component to a server component (no client interactivity).
- `app/(marketing)/changelog/page.tsx` — converted from a hardcoded `entries` array to a server component that reads the repo's `CHANGELOG.md` at request time (cached for 5 minutes via `export const revalidate = 300`). Includes a small inline-markdown parser for the segments that appear in our entries (`` `code` ``, `**bold**`, `*em*`) — no full markdown library pulled in for a single page. Versions are extracted from `## [version] - date` headings, the `**Theme:**` line is shown as the entry summary, and the first 8 list items per release are shown with type-coded badges (`feat` emerald, `fix` amber, `perf` blue, `note` slate). The `Latest` ribbon now sits on whatever version is genuinely latest in the file. Caps display at the 12 most recent releases with a "view full history" link to GitHub. Switched indigo → brand lime to match the rest of the marketing site. Empty-state fallback if `CHANGELOG.md` is missing.

### Verification

- Type-check clean.
- Lint clean (only pre-existing `@/global-error.tsx` `<img>` warning).
- 143/143 tests passing.
- Production build clean. Both pages now appear in the route map as static (changelog uses ISR via `revalidate`).

## [1.3.2.9] - 2026-04-26

**Theme:** Demo-data eradication, round 10 — Workspace Settings page wired to real backend. Three more dead UI shells caught: (1) the General tab pre-filled `defaultValue="My Workspace"` and `defaultValue="my-workspace"` regardless of the actual workspace, with a "Save changes" button that had no `onClick`; (2) a "Delete workspace" button that also had no `onClick`; (3) a Notifications tab with four toggles (Task assigned / Decision review / Weekly digest / Thread mentions) all rendered in the brand "on" state with `<button>` elements that had no handlers and no persistence layer (no `notification_preferences` table exists). Three more "looks like a real settings page, does nothing" surfaces. All wired up.

### Added
- `app/api/v1/workspace/[slug]/route.ts` — added `PATCH` and `DELETE` handlers. PATCH validates `name` (1–80 chars) and `slug` (lowercase letters/digits/dashes, 1–50 chars), checks owner-or-admin role, ensures the new slug isn't taken by another workspace (returns `SLUG_TAKEN` 409 on collision), and returns the updated workspace. DELETE checks owner-only and cascades through the schema's foreign keys (workspace_members, workflows, nodes, edges, decisions). New shared `resolveWorkspaceForCaller` helper used by both handlers.

### Changed
- `app/(app)/workspace/[slug]/settings/page.tsx` — General tab: name and slug inputs now controlled, hydrated from `useWorkspaceStore` on mount, with auto-slugify on name blur (only if user hasn't customized the slug). "Save changes" button calls the new `PATCH /api/v1/workspace/[slug]`, updates the store on success, redirects to the new URL when the slug changes, surfaces the four expected error codes (`SLUG_TAKEN`, `VALIDATION_ERROR`, `FORBIDDEN`, generic) with human-readable copy, and shows a transient "Saved" confirmation. Slug input has live validation (red helper text below the field). Logo upload area replaced with an honest "Logo uploads ship with the next storage migration" hint instead of a clickable-but-non-functional dashed box. Danger zone: Delete button now opens an inline confirm step ("Yes, delete \"Acme Corp\"" / "Cancel") before calling `DELETE /api/v1/workspace/[slug]`; on success redirects to `/onboarding`. Notifications tab: removed the four fake toggle buttons, replaced with an honest explainer that per-event prefs ship once the `notification_preferences` table lands, plus a list of the four event types showing "on by default" and a `mailto` opt-out for the interim.

### Removed
- The `Palette` lucide-react import (was only used as the dead logo placeholder icon).

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual verification of the new API route: schema validates name/slug, slug-taken collision returns 409, role gate returns 403 for non-owner DELETE.

## [1.3.2.8] - 2026-04-26

**Theme:** Demo-data eradication, round 9 — partial walk-back of round 6's overcorrection. Round 6 (v1.3.2.5) replaced the entire ImportModal with an honest "Import flows are in development" empty state because every connector in the wizard simulated work that wasn't real. After shipping that, a closer audit of `app/api/v1/import/route.ts` revealed that the **CSV path was actually live** — when the API receives `source: 'csv'` with an inline `data` array of `{ title, type, status?, data? }` items, it creates a `workflows` row and inserts each item as a `nodes` row in the workspace. The OAuth-based connectors (Notion API, Linear, Trello, Asana, Notion ZIP) only return a fake `jobId` with `status: 'queued'` and never run, but CSV ingestion is fully functional. Round 6 threw both away. This round restores CSV upload as a real working flow while keeping OAuth connectors honestly tagged `Soon`.

### Changed
- `components/ui/ImportModal.tsx` — added a real CSV upload path. Single-step UI with a brand-prominent "Choose CSV file" button at the top. Selected file is read in the browser, parsed with a minimal RFC 4180-ish parser (handles quoted fields, embedded commas, double-quote escapes, multi-line cells), mapped to the API's expected shape (auto-detects `title`/`name`/`task`/`subject` for the title column, optional `type` column normalized against the 7 valid node types `task / doc / decision / thread / pulse / automation / table`, optional `status` column, all other columns rolled into the per-node `data` field), and POSTed to `/api/v1/import` with `source: 'csv'`. On success, shows the real imported count returned by the API ("Imported 47 nodes"). On error, surfaces the API error message in a red banner. The 5 OAuth connectors (Notion / Notion ZIP / Linear / Trello / Asana) remain visible but visually disabled with `Soon` tags and an amber explainer plus a `mailto` "Vote on which connector ships next" link, so visitors understand the roadmap without being lied to.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual confirmation: a CSV with `title,type,status` columns uploads, hits the API, creates real rows in `workflows` and `nodes`, and the success screen reflects the API's actual returned `imported` count.

## [1.3.2.7] - 2026-04-26

**Theme:** Demo-data eradication, round 8 — the onboarding-flow lie. Every new user signing up for Lazynext landed on a 3-step "Create Workspace" flow whose final step asked them to log their first decision (Question / Resolution / Rationale fields). On submit, the page showed confetti, animated a green circular score badge with a hardcoded **`84`** above `/100`, and declared "Your workspace is ready! Great first decision. Your team is going to love this." Except — the decision was never saved. `handleLogDecision` did exactly four things: `setShowSuccess(true)`, `setShowConfetti(true)`, two `setTimeout` calls for animation. No fetch. No POST. No score calculation. The 84 was a constant. Then "Go to Workspace" finally created the workspace via the real `/api/v1/onboarding/workspace` endpoint and navigated, leaving the user with an empty workspace and a memory of a decision that was never logged. This was the **first impression** of the entire product — the moment a new user formed their belief about what "Decision DNA" actually is. It promised AI scoring of every decision and demonstrated that promise with a literal hardcoded `84`. The default Question field was also pre-filled with "Which database should we use?" — a sample question masquerading as the user's own. All gone. Onboarding now does the real flow end-to-end.

### Changed
- `app/(app)/onboarding/create-workspace/page.tsx` — `handleLogDecision` rewritten to do the actual work in the right order: (1) POST `/api/v1/onboarding/workspace` to create the workspace, capture the returned `id` and `slug`; (2) POST `/api/v1/decisions` with the user's question + resolution + rationale against that real workspace ID, capture the real `quality_score` from the AI scorer in the response; (3) only then transition to the success screen. Score badge now displays the real returned score (rounded), or — if the decision API call failed (e.g., AI keys missing in dev environment) — falls back to a green checkmark with copy "Decision logged. (Quality scoring kicks in once the AI keys are configured.)" instead of fabricating a number. Pre-filled sample question (`'Which database should we use?'`) cleared so the input starts empty. `handleGoToWorkspace` simplified — workspace is already created, it just navigates. Loading spinner now sits on the "Log Decision" button (where the real work happens) instead of on "Go to Workspace" (which is now instantaneous). Error surfacing moved into the form step where the user can correct it.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- The fake `84` constant is gone from `app/(app)/onboarding/create-workspace/page.tsx` (verified by grep).

## [1.3.2.6] - 2026-04-26

**Theme:** Demo-data eradication, round 7 — Export page wired up to do real work. The Export page had a particularly subtle deception: a real, working `GET /api/v1/export?workspaceId=<uuid>` endpoint exists and returns a complete JSON snapshot of the workspace (workflows, nodes, edges, decisions with scores). But the UI never called it. Instead the "Export Full Workspace" button kicked off a `setInterval` that filled a fake progress bar with `Math.random() * 8` increments, transitioned to an "Export Ready!" success card showing a `workspace-export-2026-04-26.json` filename — and then the "Download File" button did nothing. The "Export Decisions" button had no `onClick` handler at all. The API note at the bottom claimed two endpoints existed (`GET /api/v1/export/workspace`, `GET /api/v1/export/decisions`) when in reality only one existed and it had a different path. Worst kind of fake: real backend already shipped, but the UI pretended to fake it.

### Changed
- `app/(app)/workspace/[slug]/export/page.tsx` — full rewrite of the export logic. Both buttons now call `fetch('/api/v1/export?workspaceId=' + workspace.id)`, parse the JSON, build a `Blob`, and trigger a real browser download via a programmatic `<a download>` click. Workspace ID resolved from `useWorkspaceStore` (populated by the layout). Decisions-only export filters the same payload client-side by date range (since no separate `/api/v1/export/decisions` endpoint exists, the UI is honest about that — the API note now reflects reality with one endpoint and a footnote explaining the decisions button is a client-side filter). Removed: fake `setInterval` progress, `Math.random() * 8` increments, the no-op "Download File" success button, the empty-onClick "Export Decisions" button, the misleading CSV/PDF format options the API can&apos;t produce, and the false claim that two distinct API paths exist. Added: real error surfacing (red banner with the API error message), disabled state when workspace hasn&apos;t loaded yet, "Re-export" CTA on success, `lazynext-export-YYYY-MM-DD.json` and `lazynext-decisions-YYYY-MM-DD.json` filenames.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual confirmation: clicking "Export Full Workspace" with a real workspace ID hits `/api/v1/export`, downloads a JSON file containing `version`, `exportedAt`, `workspaceId`, `workflows`, `nodes`, `edges`, `decisions`. Decisions filter respects date-range selector.

## [1.3.2.5] - 2026-04-26

**Theme:** Demo-data eradication, round 6 — the most directly misleading flow in the app. The Import Data modal at `/workspace/[slug]/import` opened a 3-step wizard that simulated a complete Notion import end-to-end: a fake "Connect & Start Import" button kicked off a `setInterval` that filled three fake progress bars (Docs / Tasks / Connections) with random math until they all hit 100%, then showed a green checkmark success screen claiming "12 docs, 24 tasks, and 18 connections imported" alongside a fake terminal log: `✓ Connected to Notion workspace · ✓ Importing pages as DOC nodes... · ✓ Importing databases as TASK nodes... · ⚠ Skipped 2 embedded images (not supported) · ✓ Building edge connections...` None of it was real. There is no OAuth handshake, no ingestion endpoint, no schema mapper — clicking "Go to Workflow" in the success screen just closed the modal and the workspace stayed empty. Users who tried to import their data and watched the fake terminal log scroll by were the most directly deceived audience the app had. Replaced with an honest version: the planned connectors are listed (each tagged `Soon`), an amber "Import flows are in development" notice explains the OAuth + mapper + pipeline ship together, and the CTA is now a `mailto:hello@lazynext.com?subject=Import connector priority` link instead of a fake "Connect" button. The fake Step indicator, fake progress bars, fake terminal log, and fake "12 docs, 24 tasks" success screen are all gone.

### Changed
- `components/ui/ImportModal.tsx` — full rewrite. Removed the 3-step wizard with simulated `setInterval` progress, the random-number progress math (`Math.random() * 15`), the fake terminal log with checkmarks, the fake `Q2 Product Sprint` / `Client Onboarding` workflow scope dropdown, and the `12 docs, 24 tasks, 18 connections imported` success copy. New version is a single-step honest preview: roadmap connector list with `Soon` tags + amber "in development" notice + email-us-priorities CTA. ~120 lines of fake-flow code removed.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.

## [1.3.2.4] - 2026-04-26

**Theme:** Demo-data eradication, round 5 — landing page social proof. The two highest-conversion sections of the public landing page were both fabricated. **`SocialProofBar`** (mounted directly under the hero) claimed "Trusted by 1,200+ teams across 40+ countries" with six skeleton logo bars meant to imply real customer logos that don't exist. **`TestimonialsSection`** (the "Loved by teams who ship" grid above the CTA) quoted three fictional people — Priya Raghavan (Head of Product, FlowStack), Arjun Krishnamurthy (CTO, NexaBuild), Sara Mehta (Engineering Manager, DevCraft) — with detailed quotes ("we killed 5 subscriptions in one week", "LazyMind is scary good", "Monday planning went from 45 minutes to 12 minutes — we timed it") at companies that don't exist. These weren&apos;t styled as placeholders; they rendered with 5 amber stars and looked indistinguishable from real testimonials. Both gone.

### Removed
- `components/marketing/SocialProofBar.tsx` — deleted. The "1,200+ teams across 40+ countries" claim is not true and never was. When real customer logos exist, a different component (with permission and real attribution) will replace it.
- `components/marketing/TestimonialsSection.tsx` — deleted. Lazynext is early; pretending three named strangers said specific things is the most direct kind of conversion deception. Real customer quotes go here when real customers say them.

### Changed
- `app/(marketing)/page.tsx` — removed the static `SocialProofBar` import + JSX usage and the dynamic `TestimonialsSection` import + JSX usage. Landing flow is now: Hero → Problem → Primitives → DecisionDNA → LazyMind → ConsolidationMap → Pricing → CTA. The product story stands on its own.

### Verification
- Type-check clean.
- Lint clean.
- 143/143 tests passing.
- Production build clean.
- Manual grep across `components/`, `app/`: zero remaining references to `SocialProofBar`, `TestimonialsSection`, or any of the three fictional names.

## [1.3.2.3] - 2026-04-26

**Theme:** Demo-data eradication, round 4. After three rounds clearing 17 surfaces, a fourth sweep caught **the Templates page** (a fully-fake "marketplace" with six made-up templates carrying invented popularity stats — 128 / 89 / 64 / 45 / 32 / 156 stars, 342 / 215 / 156 / 98 / 74 / 489 installs — and an "Install Template" button that flipped a state flag and showed a fake success modal without actually installing anything; there is no `templates` table, no install endpoint, no ratings system), **the public Shared Canvas page at `/shared/[id]`** (every UUID-shaped path rendered the same fake 5-node graph — "Product Roadmap → Choose Database → Implement Auth, Design Review, Build API" — with fake share-modal analytics: "24 total views / 8 unique visitors / 2m avg time"), and **the Blog listing** (linked to four posts but only `launching-lazynext` had a real body in `[slug]/page.tsx`; the other three — `decision-dna`, `graph-native`, `global-first` — 404'd when clicked). All gone.

### Changed
- `app/(app)/workspace/[slug]/templates/page.tsx` — full rewrite as honest "Templates are in development" empty state. Removed all six fake templates, fake star/install counts, fake categories grid, and the entire fake install modal that simulated a success without doing anything. Replaces the page with: a sparkles-icon explainer, a CTA back to the canvas, and a list of planned categories (Engineering / Product / Agency / Operations / Startup) with example template names so visitors understand what&apos;s coming.
- `app/shared/[id]/page.tsx` — full rewrite. Was a client component that ran the UUID regex then unconditionally rendered five hardcoded sample nodes, five hardcoded sample edges, and a Share modal showing `24 / 8 / 2m` fake analytics. Now a server component that renders an honest "Shared canvas not found" page (or "Invalid share link" for non-UUID input) and points users to the working `/d/[slug]` public-decision route. Public *canvas* sharing isn&apos;t a shipped feature — only public decisions are.
- `app/(marketing)/blog/page.tsx` — listing now reflects reality: only `launching-lazynext` is shown (the only post with a real body). When the featured-only branch is the only post, an honest "More posts on the way" placeholder fills the grid slot instead of an empty grid.

### Verification
- Type-check clean.
- Lint clean (only pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.
- Manual grep: every fake popularity number and the `sampleNodes` / `sampleEdges` constants no longer appear anywhere in `app/`.

## [1.3.2.2] - 2026-04-26

**Theme:** Demo-data eradication, round 3. v1.3.2.0 cleared the five workspace pages and v1.3.2.1 cleared the canvas, notifications, decision-health dashboard, and detail panels. A third sweep found that **the entire Account → Profile page** was hardcoded with "Avas Patel / avas@lazynext.com / Founder & Developer" as the user identity (every user saw Avas's profile regardless of who they were), with three fake browser sessions (`MacBook Air — Chrome — 104.xx.xx.42`, `iPhone 15 — Safari`, `Windows PC — Firefox — 82.xx.xx.88 — London, UK`) and a fake "Side Project" workspace in the workspace switcher. **The Billing page** invented four invoices (`Apr 1 / Mar 1 / Feb 1 / Jan 15`) and four hardcoded usage counts (342 nodes / 47 decisions / 23 LazyMind / 1.2 GB) plus a fake `•••• 4242` Visa card and a fake "Next billing: May 1, 2026" date. **The Integrations page** showed Slack and Notion as connected to every user with active "Disconnect" buttons, plus a fake masked API key (`lnx_sk_••••...`) with copy/regenerate controls behind a non-functional flow. **The Export page** invented three past exports and a hardcoded "Export 47 Decisions" button. All gone. Added `NodeDetailPanelLegacy.tsx` (orphaned dead file with a fake "Priya / Avas / PlanetScale" thread) deleted entirely; replaced with an inline `FallbackPanel` for node types without a dedicated panel.

### Changed
- `app/(app)/workspace/[slug]/profile/page.tsx` + new `app/(app)/workspace/[slug]/profile/ProfileClient.tsx` — full rewrite as a server component. Reads the real Supabase auth user via the new `safeAuthUser()` helper, deriving first/last name from `user_metadata.full_name`, avatar from `user_metadata.avatar_url`, role from `user_metadata.role`, and identity providers from `app_metadata.providers`. Email field is now read-only with "Managed by Supabase Auth" hint. Avatar pulls from real `avatar_url` when present (falls back to derived initials). Workspaces section calls the new `getUserWorkspaces(userId)` helper — clicking a workspace navigates to it. Connected Accounts derives from real Supabase identity providers. Sessions tab honestly states "Per-device session list isn't available — Supabase Auth doesn't expose this; sign out and rotate your password to invalidate every refresh token" instead of fabricating IPs.
- `app/(app)/workspace/[slug]/billing/page.tsx` + new `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — split into server + client. Server fetches real `getBillingUsage` (live counts of nodes/decisions/members from Supabase) and the workspace's actual plan. Plan comparison cards now derive from `PLAN_LIMITS` constants instead of duplicated copy. Current Plan card shows real seat count. Removed entire "Payment Method" card with fake `•••• 4242 Visa` — replaced with a "Payment Method & Invoices" card linking to the Gumroad customer portal (which is where Lazynext billing actually lives). Removed entire "Billing History" table with four fake invoices. Usage card shows three real metrics (nodes, members, decisions) with `∞` rendered for unlimited limits.
- `app/(app)/workspace/[slug]/integrations/page.tsx` — `connectedIntegrations` array emptied (Slack, Notion no longer falsely shown as connected); empty state explains OAuth connectors haven't shipped. "Available" section renamed to "Coming soon" with disabled "Notify me" buttons (was non-functional "Connect" buttons that did nothing). API Access card no longer fabricates a masked key with copy/regenerate; instead an honest "API key issuance ships with the Business plan" message and disabled CTA.
- `app/(app)/workspace/[slug]/export/page.tsx` — `exportHistory` emptied (no exports table in schema); empty state explains server-side persistence is the follow-up. Removed fake "Q2 Product Sprint" + "Client Onboarding" workflow scope options. "Export 47 Decisions" generalized to "Export Decisions". Hardcoded `workspace-export-2026-04-06.json · 2.4 MB` filename now generated dynamically from current date and selected format.
- `components/canvas/panels/NodeDetailPanel.tsx` — removed import of deleted `NodeDetailPanelLegacy`. Inlined a minimal `FallbackPanel` component for node types without a dedicated panel (pulse, automation). Renders the real `node.data.title` instead of fake "Priya / Avas" sample threads.

### Added
- `safeAuthUser()` in `lib/utils/auth.ts` — returns the full Supabase `User` (email, `user_metadata`, `app_metadata`) instead of just the user id. Backs the new server-rendered Profile page.
- `getUserWorkspaces(userId)` in `lib/data/workspace.ts` — joins `workspace_members` with `workspaces` and derives the `isOwner` flag from `workspace.created_by === userId`. Powers the Profile → "Your workspaces" list.
- `getBillingUsage(workspaceId)` in `lib/data/workspace.ts` — three parallel `head:true` COUNT queries against `nodes`, `decisions`, and `workspace_members` for the Billing usage card.

### Removed
- `components/canvas/panels/NodeDetailPanelLegacy.tsx` — orphaned dead file carrying fake "Priya — Why not PlanetScale? / Avas — MySQL syntax + no RLS" sample thread. Confirmed via grep no consumers besides the now-updated `NodeDetailPanel.tsx`.

### Verification
- Type-check clean.
- Lint clean (only pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.

## [1.3.2.1] - 2026-04-26

**Theme:** Demo-data eradication, round 2. v1.3.2.0 cleared the five workspace pages but a follow-up sweep found seven more surfaces with hardcoded "Avas Patel / Priya Sharma / Raj Kumar / Fix auth redirect bug" fixtures: every empty canvas auto-injected 5 demo nodes, the global notification bell rendered 8 fabricated alerts, the Decisions Health dashboard was 100% fixture-driven with fake leaderboards and fake quality trends, the workspace Settings → Members tab hardcoded "Avas Patel · avas@lazynext.com · Owner", and the canvas detail panels (thread, decision, task) shipped fake conversations, fake comparison tables, fake assignees, and fake subtasks. All gone.

### Changed
- `components/canvas/WorkflowCanvas.tsx` — removed 5 hardcoded `defaultNodes` (Ship onboarding v2, Fix auth redirect bug, Product Requirements Doc, Use Supabase for Auth + DB?, Pricing freemium vs trial?) and 4 demo edges. Empty canvas no longer fabricates work that doesn't exist. Server-side node persistence (`/api/v1/nodes` round-trip) is the follow-up.
- `components/ui/NotificationCenter.tsx` — replaced 8 hardcoded notifications with empty array + "You're all caught up" empty state. The schema has no `notifications` table; building one is a separate feature.
- `app/(app)/workspace/[slug]/decisions/health/page.tsx` — full rewrite as server component that calls the new `getDecisionHealthStats(workspaceId, period)` helper. The dashboard now computes from the real `decisions` table: total/avg quality/outcome-tagged/velocity stat cards with real week-over-week deltas, real quality distribution buckets (high/medium/low/unscored), real outcome donut, real 7-week quality trend (always a stable 7-week window regardless of the selected period filter), real top decision makers grouped by `made_by` with name resolution via `getWorkspaceUsers`, real type breakdown (reversible/irreversible/experimental/unspecified), real tag counts, real stale-untagged list (pending outcome + 30+ days old, links to the actual decision). LazyMind insight is now generated from real signal — surfaces low-quality %, untagged %, or strong-outcome praise based on which threshold trips.
- `app/(app)/workspace/[slug]/settings/page.tsx` — Members tab no longer hardcodes "Avas Patel · avas@lazynext.com · Owner". Replaced with a redirect card to the dedicated `/members` page (which shipped real data in v1.3.2.0).
- `components/canvas/panels/ThreadPanel.tsx` — gutted 5 hardcoded fake messages (including the "Supabase vs PlanetScale vs Firebase" comparison table) and 4 hardcoded mention options. Honest empty state. Made-by date no longer hardcoded "Apr 2, 2026" — only renders when the node carries a real `createdAt`.
- `components/canvas/panels/DecisionDetailPanel.tsx` — gutted 2 hardcoded thread replies and the always-shown "Avas Patel · Apr 2, 2026" Made-by row. Made-by now reads from `node.data.madeByName / madeByInitials / createdAt` and only renders when present.
- `components/canvas/panels/TaskDetailPanel.tsx` — gutted 3 hardcoded assignee options and 3 hardcoded subtasks (Wireframe review / API integration / QA testing). Subtasks now read from `node.data.subtasks` if present.

### Added
- `getDecisionHealthStats(workspaceId, period)` in `lib/data/workspace.ts` — period-aware aggregate over the `decisions` table returning quality buckets, outcome counts, 7-week stable trend window (refetched independently so a `period=7d` filter doesn't truncate the trend), top decision makers, type breakdown, tag counts, and stale-untagged list. Independent previous-period query produces real WoW deltas for the stat cards.

### Verification
- Type-check clean.
- Lint clean (only the 2 pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.
- Manual grep: every fake fixture name (Avas Patel, Priya Sharma, Priya Shah, Raj Kumar, Rahul Dev, Sana Malik, Meera Joshi, Neha Kapoor, "Fix auth redirect bug") removed from `app/` and `components/canvas/`. The marketing About page retains its founder team listing — that is intentional product copy, not demo data.

## [1.3.2.0] - 2026-04-26

**Theme:** Demo-data eradication. Five core workspace pages — Tasks, Members, Activity, Pulse, Automations — were rendering hardcoded "Avas/Priya/Rahul/Sana" fixtures regardless of who was logged in or which workspace they were viewing. New users saw a populated-looking team that didn't exist. This release rips out every fake array and wires four of the five surfaces directly to live Supabase data with proper empty states. Automations gets an honest "engine in development" placeholder rather than a fake-but-non-functional UI — the build engine itself is a multi-week project that will land in a future release.

### Added
- `lib/data/workspace.ts` — four new server-side data helpers used across the converted pages:
  - `getOrCreateDefaultWorkflow(workspaceId, userId)` — returns a workspace's first workflow, creating a "Main" one if none exists. Required because tasks/docs/decisions live as nodes under a workflow.
  - `getWorkspaceUsers(workspaceId)` — joins `workspace_members` with `auth.users` (via service-role admin client) to return real members with email, name, avatar URL, and computed initials. Replaces every hardcoded member array in the app.
  - `getMemberStats(workspaceId)` — per-member counts of open tasks (`assigned_to`) and decisions logged (`made_by`). Powers the Members directory.
  - `getWorkspaceActivity(workspaceId, limit)` — composes a real activity feed from `decisions`, `nodes`, and `messages` tables (no dedicated `activity_events` table needed). Returns a unified `ActivityEvent[]` sorted by `created_at`.
  - `getPulseStats(workspaceId)` — runs 12 parallel aggregate queries to compute tasks-done-this-week vs last-week, overdue count, decisions per week, avg decision quality per week, active threads per week, daily completion histogram for the last 7 days, and per-member open-task workload.

### Changed
- `app/(app)/workspace/[slug]/tasks/page.tsx` — converted from a `'use client'` component with a hardcoded 10-item fake task array (`"Fix auth redirect bug"`, fake `AP/PS/RD/SM` initials, fake priorities) to a server component that fetches real `nodes` of `type=task` via `getWorkspaceTasks`. Real CRUD: the new `tasks/TasksClient.tsx` provides board + list views, an "Add Task" modal that POSTs to `/api/v1/nodes` (status, assignee from real members, real workflow_id), inline status changes that PATCH the same endpoint with optimistic updates, and a real empty state ("No tasks yet — Add your first task"). Cards now show real assignee initials with email tooltips.
- `app/(app)/workspace/[slug]/members/page.tsx` — converted from `'use client'` with a hardcoded 4-member fake team (`Avas Patel`, `Priya Shah`, `Rahul Dev`, `Sana Malik`) plus 2 fake pending invites to a server component that reads real `workspace_members` joined with `auth.users` via `getWorkspaceUsers` + per-member counts via `getMemberStats`. Owner is correctly identified by `workspace.created_by`. Members are sorted Owner → Admin → Member → Guest, then alpha. Plan/seat-limit logic preserved with the same paywall hook for member-limit gating. The fake-pending-invites section is removed; the invite modal now offers an honest "Email invitations are coming soon" copy + a copy-to-clipboard workspace URL share flow.
- `app/(app)/workspace/[slug]/activity/page.tsx` — converted from a fully fake feed (`feedItems` with `Avas/Rahul/Priya` actors and made-up actions) plus fake audit-log table (`auditRows` with fake IPs `192.168.1.42`, etc.) to a server component that reads `getWorkspaceActivity` and groups events into Today / Yesterday / older buckets. Each event shows the real actor (resolved from workspace members), real resource type (decision, task, doc, thread, message) with the correct node-type color, and real `created_at` timestamps formatted relatively. The Audit Log tab now shows an honest "Detailed audit logs are an Enterprise feature" empty state instead of fake IP-address rows.
- `app/(app)/workspace/[slug]/pulse/page.tsx` — converted from a `'use client'` page with hardcoded `metrics` (`Tasks Done 18/34`, `Overdue 3`, `+12%`), hardcoded `workload` array, hardcoded `burndownData`, hardcoded `activityTimeline`, hardcoded `weekComparison`, and a hardcoded "Rahul is overloaded — redistribute 4 tasks to Sana" LazyMind summary. Now: every metric card pulls from `getPulseStats`. Workload is real per-member open-task counts joined with member names from `getWorkspaceUsers`. The fake sprint burndown chart was replaced with a real "Tasks completed — last 7 days" bar chart (one bar per day, real counts from `nodes.updated_at` where `status=done`). Recent activity uses the same `getWorkspaceActivity` feed. Week-over-Week is a real diff. The LazyMind summary is now generated from the real numbers via a `buildSummary()` function that picks meaningful sentences (e.g. only mentions overload if someone has ≥10 open tasks, only mentions quality delta if it shifted ≥3 points) — no more fixed copy.
- `app/(app)/workspace/[slug]/automations/page.tsx` — converted from a `'use client'` page with hardcoded `sampleAutomations` rules and a fake run-history visualization to a server component that renders an honest empty state. Headline: *"The automations engine is in development."* The rule library below ("Auto-assign new tasks", "Decision reminder", "Weekly digest", "Blocked task alert") is shown as a preview at 80% opacity with a clearly-disabled "Create automation (coming soon)" button. Footer note explicitly states no fake automations or run history are shown. The `FeatureGate` for Pro tier remains in place for when the engine ships.

### Why automations got an empty state instead of full wiring
The schema has no `automations` table — only `automation_runs` which is keyed on `node_id` (treating each automation as a node). Building a real engine requires: a triggers table (event/cron/threshold), an actions table (notify/assign/email/webhook), an executor (probably Inngest, which is already a dep), test coverage for the rule evaluator, and a UI that round-trips state through all of it. That's multi-week work and shipping a fake-but-non-functional UI in the meantime would actively mislead users. The honest empty state is the correct trade.

### Verification
- `npm run type-check` — clean
- `npm run lint` — clean (same 2 pre-existing `<img>` warnings in `app/global-error.tsx` and `app/shared/[id]/page.tsx`)
- `npm test` — **143/143** passing
- `npm run build` — clean
- Manual: every fake hardcoded fixture name (`Avas Patel`, `Priya Shah`, `Rahul Dev`, `Sana Malik`, `Fix auth redirect bug`, `Use Supabase for DB`, `Canvas zoom`, `API Spec v3`) grep'd to zero in `app/`.

## [1.3.1.1] - 2026-04-26

**Theme:** Boomerang QA fix on the v1.3.1.0 rebrand. With the brand color flipped from cobalt to lime, every surface that paired `bg-brand` with `text-white` (which passed AA on cobalt) suddenly failed AA on lime — white on `#BEFF66` doesn't reach 4.5:1 contrast. Found ~60 component-level instances across the codebase plus the entire auth left panel and CTA banner. All swapped to `text-brand-foreground` (`#0A0A0A`, near-black, the WCAG-safe pairing baked into the logo). Two `bg-white text-brand` CTAs (lime-text on white, also fails) were upgraded to `bg-slate-950 text-brand` — black-pill-with-lime-text — mirroring the logo's exact color pair for max recognition. Final logo PNGs were also dropped in at `Lazynext_Logo.png`, `public/logo.png`, `public/logo-dark.png`, `public/logo-transparent.png`, and the sidebar/topbar 24×24 slots were switched from the (now wordmark) PNG to the mark-only `/icon.svg` so they don't render as illegible blobs at icon sizes.

### Fixed
- **WCAG AA contrast on lime surfaces** — 65 files updated. Mechanically swapped `text-white` → `text-brand-foreground` whenever it appeared in the same className as `bg-brand` or `bg-brand-hover`. Touches every primary CTA across marketing, auth, app shell, canvas panels, lazymind chat, billing, settings, profile, decisions, tasks, automations, activity, integrations, templates, members, export, import, guide, pulse, onboarding, and error pages. Functional Tailwind colors (`bg-emerald-500 text-white`, `bg-red-500 text-white`, etc.) intentionally untouched — they're not on lime.
- `components/marketing/PricingSection.tsx` — entire featured tier card (full body bg-brand). Headline + price + period + description + feature list items + Check icon all switched to dark contrast colors. Replaced cobalt `bg-[#3B5AE0]` "Most Popular" pill with `bg-slate-950 text-brand` (black pill, lime text). Featured CTA upgraded from `bg-white text-brand` → `bg-slate-950 text-brand` for max brand pop.
- `components/marketing/CTABanner.tsx` — entire section bg-brand. Headline, body, and CTA all switched to dark-on-lime + black-pill CTA.
- `app/(auth)/layout.tsx` — auth left brand panel (full `bg-gradient-to-br from-brand to-brand-hover` lime gradient). Swapped headline, subheading, feature card titles + descriptions, footer, and feature icon container to dark-on-lime. Replaced legacy `text-blue-100`/`text-blue-200` (cobalt-era secondary text) with `text-brand-foreground/75` and `/60` opacity variants.
- `app/(marketing)/pricing/page.tsx` — standalone /pricing page filled-tier CTA, "Most Popular" pill, and featured tier styling.

### Logo assets
- `Lazynext_Logo.png` (root), `public/logo.png`, `public/logo-dark.png`, `public/logo-transparent.png` — all replaced with the new black-on-lime PNG (236K each).
- `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx` — at 24×24 px, switched the logo source from `/logo-dark.png` (full wordmark, illegible at icon size) to `/icon.svg` (mark-only — lime square + black geometric mark — designed for icon sizes).

### Verification
- `npm run type-check` clean
- `npm run lint` clean (same 2 pre-existing `<img>` warnings in `app/global-error.tsx` and `app/shared/[id]/page.tsx`)
- `npm test` — **143/143** passing
- `npm run build` — clean, 60+ routes
- 0 instances of `bg-brand text-white` remain in source

## [1.3.1.0] - 2026-04-26

**Theme:** Rebrand to the new black-on-lime logo. Lime (`#BEFF66`) replaces cobalt (`#4F6EF7`) as the primary brand color across the entire platform — Tailwind tokens, CSS custom properties, marketing site, app shell, canvas selection, Decision DNA charts, email templates, PWA manifest, OG image, and apple-icon. Lime is treated as an **accent only** (CTAs, focus rings, link underlines, active states, hero logo card). Full-page lime backgrounds were rejected as unprofessional. Text on lime is always near-black `#0A0A0A` to satisfy WCAG AA contrast — same pairing as the logo mark.

### Changed
- `tailwind.config.ts` `brand` palette → lime (`DEFAULT: #BEFF66`, `hover: #A6E64D`, `light: #E8FFC9`, `lighter: #F4FFE3`) + new `brand.foreground: #0A0A0A` token for text-on-lime.
- `app/globals.css` — CSS custom props (`--color-primary`, `--color-primary-hover`, new `--color-primary-foreground`) and `.gradient-hero`/`.gradient-decision` recipes switched from blue-tinted to lime-tinted.
- `components/marketing/HeroSection.tsx` and `components/marketing/ConsolidationMap.tsx` — connector strokes lime, central "Lazynext" card switched from cobalt-with-white-text to lime-with-near-black-text (mirrors the new logo at the most brand-recognizable spot on the landing page).
- `components/canvas/edges/WorkflowEdge.tsx` — selected edge stroke now lime.
- `app/(app)/onboarding/create-workspace/page.tsx` — confetti palette starts with lime.
- `app/(app)/workspace/[slug]/decisions/health/page.tsx` — Decision DNA quality-trend gradient, line, and current-point all now lime.
- `lib/email/templates/index.tsx` — `BRAND_COLOR` now lime, `BRAND_FOREGROUND` (`#0A0A0A`) added; header/button/footer link colors recalibrated for AA contrast on lime.
- `public/icon.svg` and `app/apple-icon.tsx` — replaced the legacy red "L" mark with the new black geometric mark (quarter-circle + small filled square) on a lime square.
- `app/opengraph-image.tsx` — kept the dark social-preview background but introduced a lime card holding the black mark + "Lazynext" wordmark, so the brand color pops against dark in Twitter/LinkedIn previews.
- `public/manifest.json` `theme_color` → lime so Android Chrome's address bar and task switcher show brand color.
- `tests/e2e/seo-a11y-api.spec.ts` — updated `theme_color` assertion to `#BEFF66`.

### Documentation
- `docs/design-system.md` — palette tables updated; added explicit "Brand lime is an ACCENT, not a background" rule and the WCAG-mandatory `'#0A0A0A` on lime' pairing rule.
- `AGENTS.md` and `README.md` — brand summaries updated to lime + the foreground-pair rule.
- Historical `docs/features/*/design-spec.md` design specs (50 files) intentionally left unchanged. They document v1's visual decisions for posterity per the Mastery framework convention; future re-design work would create new design briefs.

### Logo asset (action item — not blocking deploy)
- `Lazynext_Logo.png` and `public/logo*.png` are still the previous PNGs. User will drop new versions into the repo; no code change needed since the file paths are unchanged.

### Verification
- `npm run type-check` clean
- `npm run lint` clean (same 2 pre-existing `<img>` warnings, no new)
- `npm test` — **143/143** passing
- `npm run build` — clean, all 60+ routes compile

## [1.3.0.6] - 2026-04-26

**Theme:** Stop the CSP from blocking Sentry session replay's blob: Web Worker on every page. Live dogfood (`/qa` → 17 routes) found the same console error fired on every public page: `Refused to create a worker from 'blob:...' because it violates the following Content Security Policy directive: script-src 'self' 'unsafe-inline'. Note that 'worker-src' was not explicitly set, so 'script-src' is used as a fallback.` Sentry replay (`replayIntegration` in `sentry.client.config.ts`) bundles its compression logic as a `blob:` Worker. With `replaysOnErrorSampleRate: 1.0`, every error session was supposed to capture a replay — none of them could.

### Fixed
- `next.config.js` CSP — added explicit `worker-src 'self' blob:` directive (was implicitly falling back to `script-src` which had no `blob:`). Also added `blob:` to `script-src` so libraries that ship code as blob URLs (some xyflow/ReactFlow worker patterns) keep working. Verified across all 17 public routes (`/`, `/pricing`, `/sign-in`, `/sign-up`, `/about`, `/features`, `/blog`, `/changelog`, `/comparison`, `/contact`, `/privacy`, `/terms`, `/docs`, `/careers`, `/sitemap.xml`, `/robots.txt`, `/d/[slug]`).

### Tests
- `tests/unit/csp.regression-001.test.ts` — 4 assertions: `worker-src` directive present, allows `'self'` + `blob:`, `script-src` still allows `blob:`, baseline (default-src/object-src/frame-ancestors/base-uri/form-action) unchanged.

### Verification
- `npm run type-check` clean
- `npm run lint` clean
- `npm test` — **143/143** passing (139 + 4 new regression assertions)
- `npm run build` clean

## [1.3.0.5] - 2026-04-24

**Theme:** Turn the opaque "No workspace selected" toast into a specific, actionable error so we can tell what is actually blocking the Upgrade flow. v1.3.0.4's race-fix didn't resolve the production bug, which means the lookup is legitimately failing — this release tells the user (and us) why.

### Changed
- `components/ui/UpgradeModal.tsx` — `resolveWorkspaceId()` now returns a tagged result (`{ok: true, ...}` or `{ok: false, reason}`). The click handler maps each failure mode to a human-readable toast:
  - `NO_SLUG` → "Open a workspace page first"
  - `UNAUTHORIZED` (401) → "Session expired, refresh and sign in"
  - `FORBIDDEN` (403) → "Not a workspace member — ask an owner to add you"
  - `NOT_FOUND` (404) → "Workspace '{slug}' not found in the database"
  - `NETWORK` → "Could not reach billing service"
  - Fallback → "Workspace lookup failed (REASON · HTTP STATUS)"

Why: the founder tested v1.3.0.4 in prod and still saw the old generic toast. That means the store is cold AND the inline resolve is failing. Without knowing which HTTP status, we can't tell whether the user isn't a member, the slug doesn't exist, or there's an auth issue. Exposing the real reason is the fastest path to the fix.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.4] - 2026-04-24

**Theme:** Kill the race condition behind "No workspace selected" error toasts in the Upgrade modal. v1.3.0.3 added a layout-mount hydrator, but an impatient click could beat the fetch and still fire the toast. Make the click handler self-healing instead.

Why this mattered: the founder tested v1.3.0.3 in production and still got four stacked error toasts after clicking Choose Team, because the hydrator's `fetch` hadn't resolved yet when the click fired. A layout-mount hydrator is inherently racy for sub-second clicks. The fix moves the resilience into the click handler itself.

### Fixed
- `components/ui/UpgradeModal.tsx` — `handleChoose()` no longer bails on an empty Zustand store. If `workspace?.id` is missing, it falls back to `useParams().slug` from the URL, calls `GET /api/v1/workspace/[slug]` inline to resolve the ID, and primes the store while at it so subsequent clicks are instant. Only returns the "No workspace selected" toast if BOTH the store is empty AND the inline resolve fails (e.g. user is not a member or the slug is gone).

### Added
- Inline `resolveWorkspaceId()` helper in `UpgradeModal.tsx` — store-first, URL-slug-fallback pattern. Also hydrates the store on success so the WorkspaceSelector nameplate and other consumers benefit from the fetch.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.3] - 2026-04-24

**Theme:** Fix workspace store never hydrating at runtime. Unblocks the Upgrade modal checkout flow so founders (and their customers) can actually click "Choose Team" and reach Gumroad.

Why this mattered: a user clicking Choose Team in the Upgrade modal was hit with four "No workspace selected" error toasts and a dead button. The workspace Zustand store was populated by tests but never by production code, so `UpgradeModal.tsx` bailed on its `workspace?.id` guard every time. This blocked the entire billing test flow on production.

### Fixed
- `components/ui/UpgradeModal.tsx` no longer bails with "No workspace selected" on every click. The workspace store is now hydrated at the layout level on every workspace page.
- Silent pre-existing bug where `WorkspaceSelector.tsx` rendered the string "Workspace" as a fallback instead of the actual workspace name (same root cause: empty store).

### Added
- `app/api/v1/workspace/[slug]/route.ts` — `GET` endpoint that returns `{id, name, slug, plan, logo}` after Clerk auth + `workspace_members` membership check. Dev-mode fallback returns a synthetic workspace when `DATABASE_URL` is a placeholder so local dev still renders end-to-end.
- `components/layout/WorkspaceHydrator.tsx` — client component that fetches the endpoint once on slug change and calls `setWorkspace()` on the Zustand store. Silent fallback on error so downstream surfaces still render their empty-store UI.
- Wired `<WorkspaceHydrator slug={slug} />` into `app/(app)/workspace/[slug]/layout.tsx` alongside the existing `<WmsHydrator>`.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.2] - 2026-04-23

**Theme:** Clean up stale setup-doc references that still told founders to create 6 Gumroad products across 3 tiers (starter/pro/business). v1.3 only shows 2 tiers on the pricing page — Team and Business — which map to the `STARTER` and `PRO` env-var keys (legacy naming from when the tiers were named that way). Deploy docs are now aligned to the 4-product reality.

Why: a careful founder reading `DEPLOY.md` or `README.md` before the walkthrough would over-provision 2 extra Gumroad products (`BUSINESS_*` env vars) that the v1.3 pricing page never links to. The walkthrough itself (`docs/FOUNDER-SETUP-WALKTHROUGH.md`) was already correct. Aligning the deploy refs to match.

### Changed
- `DEPLOY.md`: prerequisites line now says `4 recurring (subscription) products: team/business × monthly/yearly` instead of 6-across-3-tiers; env var table entry shows `{STARTER,PRO}` not `{STARTER,PRO,BUSINESS}` with a note that `STARTER`=Team, `PRO`=Business (legacy naming). Removed stale `v1.0.0.1` version stamp from the doc preamble.
- `README.md`: env var table entry for Gumroad URL permalinks now says 4, not 6.
- `docs/project-context.md`: same correction in the project reference env-var table.

### Not changed (intentional)
- `lib/billing/plans.ts`: still defines a `business` plan entry with `NEXT_PUBLIC_GUMROAD_BUSINESS_*` fallbacks. That code path is dead in v1.3 messaging (pricing page never links Business to the `business` key — it uses `pro`). Leaving the code shape alone so a future Solo/Enterprise tier can slot in without touching billing plumbing. Dead env vars are harmless if unset.
- `.env.example`: still lists all 6 URL placeholders. It's a template of what can be set, not what must be set.
- `docs/FOUNDER-SETUP-WALKTHROUGH.md`: already correctly lists 4 env vars. No change needed.

### Pre-merge checks
- `npm run lint` clean
- `npm run type-check` clean
- `npm test` all passing

## [1.3.0.1] - 2026-04-23

**Theme:** Align internal 14-day Business trial with the 30-day trial offered on Gumroad-hosted checkout so users see one consistent number everywhere.

Why the change: Gumroad's membership trial selector only offers `one week` or `one month` as presets — no 14-day option. Picking `one month` at the Gumroad level means Gumroad-purchased subscriptions get a 30-day grace period before first charge. The internal `TRIAL_DAYS = 14` that drove the Inngest downgrade cron was now out of sync with what customers saw on the Gumroad checkout page. Keeping two different trial durations created an obvious support-load trap ("your site says 14 days but Gumroad said 30"). Aligning to 30 everywhere is the only sane fix.

Only new workspaces get the longer trial. Existing workspaces keep whatever `trial_ends_at` they were stamped with at creation time, so no retroactive extension or contraction.

### Changed
- `lib/utils/constants.ts`: `TRIAL_DAYS = 14` → `30`. Single source of truth; flows through `UpgradeModal`, `TrialBanner`, workspace-creation stamp of `trial_ends_at`, and the Inngest `handleTrialExpiryScan` cron via its shared constant import.
- `app/(marketing)/pricing/page.tsx`: Team and Business CTA text `Start 14-Day Trial` → `Start 30-Day Trial`; FAQ "Do I need a credit card?" answer now says 30 days; pricing hero subhead now says 30 days.
- `components/marketing/PricingSection.tsx`: both tier CTAs (`Team`, `Business`) updated to `Start 30-Day Trial`.
- `components/ui/FeatureGate.tsx`: paywall footer "14-day Business trial on every paid plan" → "30-day Business trial on every paid plan".
- `docs/platform-walkthrough.html`: Upgrade-Paywall preview "14-day free trial included" → "30-day free trial included".
- `lib/inngest/functions/index.ts`: comment on `handleTrialExpiryScan` updated to say 30-day trial.
- `tests/e2e/interactions.spec.ts`: FAQ assertion regex `/14-day.*trial/i` → `/30-day.*trial/i`.
- `docs/references/billing-architecture.md`: constants snippet and prose reference updated.
- `docs/FOUNDER-SETUP-WALKTHROUGH.md`: Inngest sync section now says 30-day trial expiry cron.
- `docs/features/22-upgrade-paywall-modal/*` (design-spec.md, design-brief.md, mockups/upgrade-paywall-modal.html): all 8 mentions of "14-day" updated to "30-day" across design spec, brief, and HTML mockup.
- `docs/features/02-pricing-page/mockups/pricing-page.html`: FAQ answer now says "30-day Business trial" (also fixed stale "Pro trial" wording to "Business trial" for v1.3 alignment).
- `docs/BUSINESS-MODEL-CANVAS.md`: 4 mentions updated across Customer Relationships, Revenue Streams, Revenue Scenarios ASCII box, and Product-led growth engine summary. Also promoted "Pro trial" naming to "Business trial" to match v1.3 plan naming.
- `LAZYNEXT_COMPLETE_BLUEPRINT_V9.md`: Section 71 row 48 (trial logic build task) updated to "30-day Business trial on workspace creation".

### Not changed (intentional)
- `LAZYNEXT_COMPLETE_BLUEPRINT_V9.md` lines 4461, 6757, 6764: these are about a 14-day **inactivity** timer and a 14-day **onboarding mode** window, not the trial. Different concepts, left alone.
- `CHANGELOG.md` and `docs/project-changelog.md` historical entries for v1.1 (which shipped the original 14-day trial) and v1.2 retained as the historical record. Only forward entries reflect 30.
- Existing workspace `trial_ends_at` timestamps. The change is forward-only; workspaces created before this ship keep their original 14-day window.
- SQL migration files. No schema change, just a constant.

### Pre-merge checks
- `npm run lint` clean
- `npm run type-check` clean
- `npm test` all passing (includes updated `interactions.spec.ts` regex)

### Founder action required
When creating the Gumroad products per `docs/FOUNDER-SETUP-WALKTHROUGH.md`, pick `one month` for the **Offer a free trial** setting on every subscription product. Do NOT pick `one week` — that creates a 7-day trial that won't match the 30-day messaging on lazynext.com.

## [1.3.0.0] - 2026-04-21

**Theme:** Lock in the final pricing strategy. Team moves to the blueprint Section 41 sensitivity-analysis sweet spot. Enterprise drops the seat minimum. Business stays put — the data says $30 is right for both personas.

Version bump is MINOR because list pricing changes user-visible but the data model is untouched. No DB migration, no new Gumroad products required on the Business side.

### Why this, not $9/$19/$39 + Solo + India PPP

The earlier pass recommended $19 Team / $39 Business with a Solo tier and India PPP override. Deep re-read of blueprint V9 Section 41 (pricing sensitivity) surfaced two facts that override that recommendation:

1. **$39 Business loses the Founder ICP.** Section 41 calls this out explicitly. Drowning Founder WTP is $15-25/seat; $39 is too far outside it. The Founder persona then stays on Team forever and never reaches Business even when they need Automation. Holding Business at $30 keeps it inside Ops PM WTP ($30-50) AND within reach of a bigger Founder-led team that has real Automation need.
2. **$15 and $19 produce nearly identical MRR at 500 workspaces** (Section 41 table: $18K vs $19K — 5% delta). The economic case for $19 is weak on MRR and strong on LTV. That makes Team a safe bump. It's not an earth-mover — it's a correction to the blueprint target.

Solo tier and India PPP are both real unlocks, but they need infrastructure we don't want to rush:
- Solo: DB enum migration (`ALTER TYPE plan_enum ADD VALUE 'solo'`), new Gumroad products, checkout schema, upgrade-modal layout for a 4th card
- India PPP: per-seat INR-priced Gumroad products OR Razorpay integration (blueprint Section 51 specifies Razorpay + per-workspace INR — a substantial rework)

Both get their own projects. Shipping them inside this v1.3 bump would destabilize a release whose whole point is "this is the final pricing call."

### Changed
- **Team pricing: $15/seat → $19/seat monthly, $12 → $15/seat annual.** Source: `lib/utils/constants.ts` (`PLAN_PRICING_USD.starter`, `PLAN_PRICING_USD_ANNUAL.starter`). Annual save is now 21% ($19 monthly → $15 annual per-mo = $180/yr, so 21.05% off). New Gumroad product prices: Team Monthly $19, Team Yearly $180. Existing $15/$144 Gumroad products should be deactivated after the switchover; current subscribers at $15 stay at $15 for the life of their subscription via Gumroad-level grandfathering.
- **Business pricing unchanged at $30/seat monthly, $24/seat annual.** Deliberate hold — see reasoning above.
- **Enterprise anchor: "From $49/seat/month · 15-seat minimum" → "Custom pricing — contact sales".** `/pricing` page Enterprise card copy updated. Blueprint has no 15-seat floor anywhere; it was a conservative add during v1.2 pricing that turned away 10-14 seat prospects who'd otherwise be perfect Enterprise fits. `components/ui/UpgradeModal.tsx` and comparison table remain unchanged — they already route Enterprise to `/contact`.
- **Pricing-page metadata description** updated from "Plans from $0 to $49/month" to "Paid plans from $19/seat/month — Enterprise custom." `app/(marketing)/pricing/layout.tsx`.
- **LazyMind marketing demo decision** now shows `D-134: Price point for Team tier → $19/seat · Score 82/100`. Keeps the demo consistent with live pricing (visitors who read the demo and then scroll to the pricing section see matching numbers).
- **Founding Member API route comment** (`app/api/v1/billing/founding-member/route.ts`) clarified: grandfathering happens at the Gumroad subscription layer, not in our DB. Existing v1.2 subscribers at $15/$30 stay there; new v1.3 Founding Members lock at $19/$30. Banner copy ("lock in today's prices for life") needed no change — it works at any list price because "today's prices" = whatever the user sees right now.
- **E2E test** `tests/e2e/interactions.spec.ts` updated to expect $19 (Team) and $30 (Business) on default monthly load, instead of $12/$24 (which were annual prices and weren't visible by default anyway — the old test was passing by coincidence).
- **Docs synced:** `docs/FOUNDER-SETUP-WALKTHROUGH.md` Gumroad product creation table now shows Team $19/$180; `docs/references/billing-architecture.md` plan-model table, constants snippet, and Gumroad setup checklist all reflect $19/$180 for Team and "Custom, no seat minimum" for Enterprise.

### Explicitly deferred (tracked for follow-up PRs)
- **Solo tier ($9/seat/mo, 1 seat).** Needs DB enum migration, 2 new Gumroad products, checkout route update, webhook plan mapping, `UpgradeModal` layout for 4 cards. Decision gate: wait for 90-day conversion data on Free → Team to see if a sub-Team price point is actually needed.
- **India PPP override.** Blueprint Section 51 specifies per-workspace INR pricing via Razorpay (₹499/₹999/₹2,999 tiers). That's a billing-provider integration, not a config flag. Per-seat INR products on Gumroad would work as an interim step but create a messy dual-provider ops story. Scope this as its own v2.0 project paired with the per-workspace pricing rework.
- **Removing the old Gumroad $15/$144 Team products.** Don't delete — they need to stay live for existing $15-subscribed Founding Members. Just unlist them from the public catalog so new buyers only see the $19 version. Non-code task; goes in the Gumroad dashboard.

## [1.2.0.0] - 2026-04-21

**Theme:** Pricing strategy correction before creating Gumroad products. Fix the structural bug where Decision Health (the hero feature) was locked behind the Business tier, bump Team/Business prices to Notion/Linear parity, reframe Founding Member around price-lock-for-life, and anchor Enterprise with a from-price.

Version bump is MINOR because this changes user-visible pricing and feature availability, not the data model. No DB migration.

### Changed
- **Decision Health Dashboard unlocks at Team tier (not Business).** `lib/utils/plan-gates.ts` now lists `'decision-health': ['starter', 'pro', 'business', 'enterprise']`. Locking the hero feature behind Business starved the entry tier of the thing users sign up for. `FeatureGate` on `/workspace/[slug]/decisions/health` now shows "Upgrade to Team" instead of "Upgrade to Business". Upgrade modal's `health-gate` variant copy updated accordingly. Unit test `tests/unit/plan-gates.test.ts` extended with explicit assertions across all four paid tiers.
- **Team pricing: $12/seat → $15/seat monthly, $10 → $12 annual.** Business: $24 → $30 monthly, $20 → $24 annual. Source of truth: `lib/utils/constants.ts` (`PLAN_PRICING_USD`, `PLAN_PRICING_USD_ANNUAL`). Matches Notion ($10) / Linear ($10) entry, charges a premium for the Decision DNA feature set. Gumroad product prices follow: Team Monthly $15, Team Yearly $144 (= $12/mo × 12), Business Monthly $30, Business Yearly $288 (= $24/mo × 12).
- **Annual discount: 17% → 20%.** Math is clean and matches the per-seat-per-month display in the pricing page. Badges and copy updated on `/pricing`, landing `PricingSection`, and `UpgradeModal` toggle.
- **Founding Member reframe: "30% off for life" → "Lock in today's prices for life".** Conceptually stronger: Founding Members aren't buying a discount, they're hedging against future price increases. `components/marketing/FoundingMemberBanner.tsx` + pricing page FAQ rewritten. `FOUNDING_MEMBER_DISCOUNT_PCT` constant removed (no instant percentage to apply). API route comments updated to reflect new semantics.
- **Enterprise tier shows an anchor price.** `/pricing` now displays "From $49/seat/month · 15-seat minimum" under the Custom label. Keeps the tier sales-led but stops Enterprise from looking like a black box. Business ($30) feels cheaper by comparison without needing a price reduction.
- **Landing page `PricingSection.tsx` synced with real tier model.** Previously stuck on the old Free/Pro $9/Business $19 preview. Now imports `PLAN_PRICING_USD` constants so both surfaces always agree.
- **Team tier marketing copy** promotes Decision Health as a Team feature across `/pricing`, landing `PricingSection`, and `UpgradeModal`. Business tier copy re-centered on what it actually uniquely unlocks: Automation, PULSE, Outcome Tracking, Semantic Search, Weekly Digest.
- **LazyMind demo decision updated for consistency:** the marketing-page demo answer now shows "D-134: Price point for Team tier → $15/seat" and "D-141: Annual discount percentage → 20%" to match the live pricing.
- **Founder walkthrough (`docs/FOUNDER-SETUP-WALKTHROUGH.md`) updated** with new Gumroad product prices so the non-technical setup flow produces products at correct final prices on first attempt.
- **Billing architecture reference (`docs/references/billing-architecture.md`)** tables rewritten: plan model prices, feature-gate matrix (Decision Health ticked at Team column), constants snippet, Gumroad setup checklist product prices.

### Explicitly deferred (for a separate PR)
- Solo tier ($8/mo, 1 seat) — expands TAM but requires DB enum migration (`ALTER TYPE plan_enum ADD VALUE 'solo'`), two new Gumroad products, checkout schema addition, and modal layout changes to fit a fourth card. Post-launch decision gated on signup data.
- Trial-card-required — moving from no-card trial to card-required is a conversion/churn tradeoff that needs real trial-conversion data before we change it.

## [1.1.0.1] - 2026-04-20

**Theme:** Deploy configuration + production domain fix.

### Added
- **Deploy Configuration block in `CLAUDE.md`** — captures platform (Vercel), production URL (`https://lazynext.com`), auto-deploy workflow (GitHub integration), merge method, pre-merge hooks, and health-check endpoint. Future `/land-and-deploy` and `/ship` runs read this instead of re-asking.

### Fixed
- **`DEPLOY.md` env var table** — `NEXT_PUBLIC_APP_URL` example corrected from `lazynext.app` to `lazynext.com` (the canonical production domain).

## [1.1.0.0] - 2026-04-20

**Theme:** Gumroad billing migration + per-seat pricing + 14-day trial + end-to-end upgrade funnel.

### Added
- **Per-seat pricing tiers** — Team ($12/$10 per seat), Business ($24/$20 per seat), Enterprise (custom/sales-led). Paid tiers are all unlimited members/nodes/workflows; AI queries remain the soft cap (100 → 500 → unlimited per seat/day). Slug→display mapping: `starter`→Team, `pro`→Business, `business`→Enterprise (DB enum unchanged — no data migration required).
- **14-day Business trial** — `TRIAL_DAYS` constant, `handleTrialExpiryScan` Inngest cron at 02:00 UTC scans for `trial_ends_at < now AND plan != 'free' AND gr_subscription_id IS NULL` and auto-downgrades to free.
- **Founding Member promotion** — first 100 paying workspaces get 30% off for life. New `FOUNDING_MEMBER_CAP` + `FOUNDING_MEMBER_DISCOUNT_PCT` constants, `/api/v1/billing/founding-member` endpoint (5-min ISR cache), live `<FoundingMemberBanner />` on the pricing page that shows remaining spots and auto-hides when closed.
- **End-to-end upgrade funnel** — `components/ui/UpgradeModal.tsx` rewritten to POST `/api/v1/billing/checkout` and redirect to the returned Gumroad URL. Seven modal variants (`node-limit`, `ai-limit`, `member-limit`, `health-gate`, `automation-gate`, `sso-gate`, `full-upgrade`) each render contextual banner copy. Enterprise tier routes to `/contact?topic=enterprise` (no Gumroad product).
- **Global upgrade trigger** — `stores/upgrade-modal.store.ts` + `components/ui/UpgradeModalHost.tsx`. Any gated surface can call `useUpgradeModal.getState().show('health-gate')` without prop-drilling. Host mounted once in the workspace layout.
- **FeatureGate paywall wrapper** (`components/ui/FeatureGate.tsx`) — renders children when `hasFeature(plan, feature)` is true; otherwise a lock card with "Upgrade to <Tier>" CTA wired to the upgrade modal.
- **Three gated pages:** Decision Health Dashboard, Automations, and PULSE now render a paywall card for Free/Team plans. New `pulse` feature key in `plan-gates.ts`.
- **Comprehensive webhook integration tests** (`tests/integration/gumroad-webhook.test.ts`) — 14 tests covering auth (wrong secret/length mismatch/missing env), sale-ping upgrades, all 6 lifecycle events, idempotency (23505 dedupe), and unknown-resource handling. Test count: 119 → 133.
- **Billing architecture reference** (`docs/references/billing-architecture.md`) — 311-line single source of truth: plan model, runtime flow diagrams, webhook resource table, schema, env vars, 10-step Gumroad setup checklist, file map, v1 non-goals.
- **Funnel telemetry** (`lib/utils/telemetry.ts`) — `trackBillingEvent(event, props)` emits structured single-line JSON logs prefixed `BILLING_EVENT`. 13 event names cover the full funnel: `paywall.gate.shown`, `paywall.modal.opened`, `paywall.checkout.clicked|succeeded|errored`, `paywall.contact.clicked`, `webhook.ping.received|duplicate|unauthorized`, `webhook.sale.applied`, `webhook.subscription.cancelled|refunded|disputed|updated`, `cron.trial.expired`. Wired into FeatureGate, UpgradeModal, all five gate triggers, Gumroad webhook, and trial-expiry cron. Dedupe window (10s) prevents click-spam from flooding logs; webhook events bypass dedupe. 6 telemetry tests lock in the JSON shape.
- **Post-purchase welcome email** — `BillingWelcomeEmail` template + `EVENTS.BILLING_WELCOME` + `handleBillingWelcome` Inngest function. Webhook sale handler fires `inngest.send(BILLING_WELCOME)` after the workspace update; handler maps plan slug → display name, looks up workspace slug for deep link, derives Gumroad manage URL from subscription id, sends via Resend. Best-effort (returns `{skipped:true}` silently when Resend isn't configured).
- **All seven upgrade-modal variants live** — every trigger now reachable from real UI:
  - `node-limit` fires from `CanvasToolbar.handleAddNode` + `WorkflowCanvas` right-click when Free hits 100 nodes
  - `ai-limit` fires from `LazyMindPanel.sendMessage` when daily cap reached; LazyMind header pill replaced the hardcoded `34/100 today` with a live session counter that turns amber at the cap
  - `member-limit` fires from the Members-page Invite button when Free hits 3 members
  - `sso-gate` fires from the Settings → Security SSO row (clickable "Unlock" button, replaces the dead grey pill)
  - `health-gate` / `automation-gate` / `full-upgrade` already live via FeatureGate and Sidebar
- **Settings → Billing tab** — real plan display (Team/Business/Enterprise) with tier-specific limits summary, "Upgrade" / "Change plan" CTAs wired to the modal, and (paid plans) an external link to `https://app.gumroad.com/subscriptions` for invoices, payment method, and cancellation.

### Changed
- `lib/utils/plan-gates.ts` — Decision Health, Semantic Search, Weekly Digest, Automation, and Pulse now unlock at `pro` (Business tier) instead of only `business`+. SSO remains `business`+ / `enterprise`.
- `lib/utils/constants.ts` — `PLAN_LIMITS` paid tiers set to unlimited for members/workflows/nodes. New `PLAN_PRICING_USD_ANNUAL` for per-seat annual pricing. `PLAN_PRICING_USD.business` is now `null` (Enterprise is sales-led).
- Pricing page (`app/(marketing)/pricing/page.tsx`) — rewritten tiers/comparison/FAQ for the new model. Enterprise column shows "Custom" + `/contact` CTA. Business column is "Most Popular". Hero copy mentions the 14-day Business trial.
- Sidebar upgrade CTA copy: "Upgrade to Pro" → "Upgrade" (tier-agnostic).
- **Billing provider migrated from Lemon Squeezy to Gumroad.** Full rip-and-replace across every touchpoint:
  - New `/api/v1/webhooks/gumroad/[secret]` route replaces `/api/v1/webhooks/lemonsqueezy`. URL-path-secret authentication (timing-safe compare); Gumroad does not sign pings.
  - Handles `sale`, `subscription_updated`, `subscription_ended`, `subscription_cancelled`, `subscription_restarted`, `refunded`, `dispute` resources.
  - `lib/billing/plans.ts` now stores Gumroad product permalinks (`GUMROAD_*_URL` / `NEXT_PUBLIC_GUMROAD_*_URL`) instead of Lemon Squeezy variant IDs. New `buildCheckoutUrl()` appends `workspace_id`/`user_id`/`plan`/`interval` as URL params so Gumroad echoes them as `url_params[...]` on the ping.
  - `/api/v1/billing/checkout` returns the env-configured Gumroad product URL (no SDK call); `/api/v1/billing/portal` returns `https://app.gumroad.com/subscriptions/<id>/manage`.
  - Schema migration `supabase/migrations/20260420000001_gumroad_migration.sql` renames `workspaces.ls_customer_id → gr_customer_email`, `ls_subscription_id → gr_subscription_id`, `ls_customer_portal_url → gr_subscription_manage_url`. Init SQL updated to emit the new columns on fresh deploys.
  - Removed `@lemonsqueezy/lemonsqueezy.js` dependency (−57 transitive packages after lockfile regen).
  - CSP `connect-src` swapped from `api.lemonsqueezy.com` to `app.gumroad.com` + `api.gumroad.com`.
  - `.env.example`, `DEPLOY.md`, `README.md`, `AGENTS.md`, `docs/project-context.md`, `docs/BUSINESS-MODEL-CANVAS.md`, and marketing copy (`about`, `terms`, `privacy`, `blog`, `HeroSection`, `DecisionDNASection`, `tasks` demo) all updated to say Gumroad.

## [1.0.0.1] - 2026-04-18

Hardening follow-up to 1.0.0.0. Closes QA-flagged gaps without changing product surface.

### Added
- **E2E test suite for `/d/[slug]`** (`tests/e2e/public-decision.spec.ts`) — 4 active tests covering 404 path, response time ceiling (ISSUE-003 regression guard), console-error cleanliness, and navigable 404 pages. 1 skipped test shows the shape to unskip once test Supabase creds are wired up in CI.
- **Structured observability logs** on `scoreDecision` — every call emits a single-line JSON log with `source`, `provider`, `model_version`, `duration_ms`. On fallback, `fallback_cause` distinguishes `no_ai_keys` / `llm_call_failed` / `json_parse_failed` so log aggregators can alert on the exact shape of a regression (ISSUE-002 class).
- 3 new unit tests locking in the log shape so alerting rules stay valid.

### Changed
- `scoreDecision` internals: split the monolithic `try/catch` into distinct AI-call and JSON-parse blocks. Previously both failure modes landed in the same bare `catch {}` with no way to tell them apart in prod.

### Operator note
Pipe `decision_scorer` log lines to your aggregator (Axiom / Datadog / Vercel / etc.) and graph `source:heuristic` by `fallback_cause`. A spike in `json_parse_failed` means Llama is returning unparseable output again — tune the prompt or extend `extractJson()`.

## [1.0.0.0] - 2026-04-18

### Added — Decision Intelligence Platform
- **4-dimension AI decision scorer** (`lib/ai/decision-scorer.ts`) — scores every decision on clarity, data quality, risk awareness, and alternatives considered (0–100 each, equal-weighted). Primary LLM is Groq (llama-3.3-70b-versatile) with Together AI fallback. Falls back to a deterministic heuristic when AI is unavailable or returns unparseable output.
- **Public decision pages** at `/d/[slug]` — opt-in shareable pages with OG metadata, dimension breakdown bars, and 5-minute ISR revalidation. Only decisions with `is_public = true` are exposed.
- **Workspace Maturity Score (WMS)** progressive exposure (`lib/wms.ts`) — sidebar features unlock as workspaces mature: L1 (0 pts) decisions + outcomes only, L2 (15 pts) unlocks tasks + threads, L3 (35 pts) unlocks docs + tables, L4 (60 pts) unlocks canvas + automations + integrations. Power users can override via `power_user_override` flag.
- **WMS API endpoint** (`/api/v1/workspace/[slug]/wms`) with GET (read score + layer) and PATCH (toggle power user override).
- **Outcome reminder loop** — `handleOutcomeReminderScan` Inngest job scans daily for decisions past their `expected_by` date and emails the author. `outcome_reminder_sent_at` stamp prevents daily re-notification storms.
- **Weekly digest rewrite** — `handleWeeklyDigest` now summarizes decisions logged, outcomes recorded, and WMS progression per workspace.
- **Decision logged hook** — `handleDecisionLogged` fires AI scoring on create, stamps `score_breakdown`, `score_rationale`, `score_model_version`, and increments workspace WMS.
- **Schema migration** `00002_decision_intelligence_spine.sql`:
  - `decisions`: `expected_by`, `score_breakdown` (jsonb), `is_public`, `public_slug`, `score_model_version`, `score_rationale`, `outcome_reminder_sent_at`
  - `workspaces`: `wms_score`, `wms_updated_at`, `power_user_override`
  - `nodes`: `decision_id`, `operational_reason` + `nodes_decision_spine_check` constraint
- **`WmsHydrator` component** — hydrates WMS state into the workspace store on app boot without blocking layout.
- **Global `Cmd+Shift+D` shortcut** to log a decision from anywhere (`GlobalLogDecisionShortcut`).
- **20 new unit tests** covering WMS gating thresholds, feature unlocks, power user override, and decision scorer JSON parsing robustness (plain JSON, ```json fences, bare ``` fences, prose-wrapped responses, out-of-range clamping, AI failure fallback, weighted aggregate math).

### Changed
- **Marketing stubs** (`/careers`, `/contact`, `/docs`) now exist as public pages with CTAs pointing at the real `/sign-up` route.
- **Sidebar** filters visible nav items by WMS layer; "Show all N sections" button optimistically flips `power_user_override` without blocking on the network.
- **Placeholder env detection** (`lib/db/client.ts`, `lib/ai/lazymind.ts`) — pattern-matches common placeholder tokens (`your-project`, `your-service-role`, `example.supabase.co`, literal `placeholder`, `your-api-key`). Stock `.env.local` values no longer waste 7+ seconds on doomed DNS lookups; DB-touching routes now return fallbacks in under 250ms.
- **Decision creation API** (`app/api/v1/decisions/route.ts`) stamps AI score on create and increments workspace WMS in the same transaction.
- **Decision quality badge** displays the 4-dim breakdown inline.

### Fixed
- **ISSUE-001**: `/careers`, `/contact`, `/docs`, and `/d/[slug]` all linked to `/signup` (404). Updated 4 link sites to the real `/sign-up` route.
- **ISSUE-002**: Decision scorer silently fell back to heuristic every time Llama wrapped JSON in ```` ```json ... ``` ```` fences. Added `extractJson()` that strips fences and isolates the outermost `{…}` from prose. The "AI scores on 4 dimensions" headline now actually runs on AI.
- **ISSUE-003**: First-run UX hung for ~7.6 seconds on every DB-touching page when `.env.local` held stock placeholder values. Now returns safe fallbacks immediately.

### Migration notes
- Run `supabase db push` (or your equivalent) to apply `00002_decision_intelligence_spine.sql`.
- Existing decisions without `score_breakdown` will still render (badge gracefully degrades to the legacy single-score display).
- New workspaces start at `wms_score = 0` (L1).
- Set `GROQ_API_KEY` in `.env.local` to enable AI scoring; without it, scoring falls back to the heuristic path automatically.

## [0.1.0.0] - 2026-04-16

### Added
- Marketing pages: Privacy Policy, Terms of Service, Contact, Careers, and Documentation
- Official Lazynext logo across all app layouts, sidebar, top bar, error pages, and marketing site
- Development mode auth bypass when Supabase is not configured, so you can explore the UI without a database
- New public routes in middleware for all marketing pages
- Business model canvas documentation

### Changed
- Replaced placeholder logo references with official brand assets (logo-dark.png, logo-transparent.png)
- Relaxed Content Security Policy in development mode to support HMR websocket connections
- Currency formatting now uses narrow currency symbols for cleaner display
