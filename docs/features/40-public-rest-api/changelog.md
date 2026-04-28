# 📝 Changelog: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Branch**: `feature/40-public-rest-api`
> **Started**: 2026-04-28
> **Completed**: 2026-04-28 (PR #11 merged)

---

## Session Notes

### Session Note — 2026-04-28 (merge + post-ship)
- **Who**: AI Agent (GitHub Copilot, Claude Opus 4.7)
- **Worked On**: Z.3, Z.4 (merge-time tasks).
  - PR #11 merged into `main` by human reviewer.
  - Bumped `VERSION` and `package.json` to `1.4.0.0`.
  - Wrote `[v1.4.0.0]` entry in [`docs/project-changelog.md`](../../project-changelog.md).
  - Flipped #40 to 🟢 Merged in [`docs/project-roadmap.md`](../../project-roadmap.md). Roadmap stats now show 40 features, 0 not-started.
- **Stopped At**: Feature done. Outstanding items are all external decisions (npm org, Scalar dep, openapi-typescript dep) that don't block this feature's "done" state.
- **Blockers**: None for #40 itself.
- **Next Steps**: When `@lazynext` is reserved on npm, flip `private: false` in `packages/sdk/package.json` and `npm publish`.

## Session Notes

### Session Note — 2026-04-28 (Phase E + polish)
- **Who**: AI Agent (GitHub Copilot, Claude Opus 4.7)
- **Worked On**:
  - **Phase E (partial — safe-only)**: extracted SDK source to `packages/sdk/` as standalone publishable directory. `package.json` set to `name: @lazynext/sdk`, `version: 0.1.0`, `private: true` (cannot accidentally publish until `@lazynext` org is reserved on npm and the flag is flipped). Wrote `README.md` (quickstart + endpoint table + versioning), `LICENSE` (MIT), `tsconfig.json`. `lib/sdk/{client,index}.ts` are now re-export shims so internal imports work unchanged.
  - **Phase E.8 verified locally**: ran `npm pack --dry-run` from `packages/sdk/` — 11 files, 6 kB packed (LICENSE, README, package.json, dist/{client,index}.{js,d.ts,*.map}). Tarball contents verified without publishing.
  - **Polish**: added `prepublishOnly: npm run build` so build runs automatically before publish. `.gitignore` now ignores `/packages/*/dist` and `/packages/*/*.tgz` so build artifacts never get committed.
  - **Z.1**: README.md gained the Public REST API section linking to `/docs/api/{quickstart,authentication,rate-limits,webhooks,versioning,changelog}` + `/api/v1/openapi.json`.
  - **Z.2**: AGENTS.md project-structure tree now lists `packages/sdk/` and notes `lib/sdk/` as a re-export shim with canonical source elsewhere.
  - **Z.5**: this entry.
- **Deviations from plan**:
  - **E.1 (npm workspaces) deferred**. Adding `workspaces: ["packages/*"]` to root `package.json` changes Vercel build behaviour (lockfile resolution, hoisting). Standalone publishable directory works for v0.1.0 and can be promoted to a workspace later if needed.
  - **E.3 (move test file) deferred**. `tests/unit/sdk-client.test.ts` still passes against the shim path. Moving it adds churn without test value.
  - **E.5/E.6 (openapi-typescript auto-gen) deferred**. Hand-written client is stable and tracks the small surface area. Auto-gen needs a new dependency that crosses the autonomy boundary.
  - **F.1/F.3 (Scalar) blocked**. Needs `@scalar/api-reference` dep approval. Static `/docs/api` page already links to raw `/api/v1/openapi.json`.
  - **F.2 (shared docs/api/layout.tsx) deferred**. All six sub-pages already share visual identity (white bg, max-w-3xl, slate-900 prose, "← API Reference" backlink). A pass-through layout adds no value.
  - **A.2 (Sentry on /api/v1) deferred**. Sentry is no-op in this repo; would need real DSN + middleware wiring to be meaningful.
  - **PR for #39 blocked**: gh CLI 404 from SAML on tokens. Manual click required.
- **Stopped At**: 24/27 tasks done, 6 commits pushed, 350/350 tests passing, type-check clean, lint clean (only pre-existing global-error.tsx warning), tarball verified.
- **Next Steps**: Human reviews + opens PR. At merge time, do Z.3 (project-changelog) and Z.4 (roadmap → 🟢 Merged). After `@lazynext` reserved on npm: flip `private: false` and run `npm publish`.

### Session Note — 2026-04-29 (continued)
- **Who**: AI Agent (GitHub Copilot, Claude Opus 4.7)
- **Worked On**: Phase C.1 via middleware shortcut.
  - `middleware.ts`: stamps `X-Request-Id` + `X-API-Version: v1` on every `/api/v1/*` response. Honours client-supplied `X-Request-Id` for log correlation. Non-clobbering — routes already setting these via `buildResponseHeaders` win.
- **Stopped At**: 339/339 tests still passing, type-check clean.
- **Blockers**: C.2 (integration test) deferred — would need a Playwright pass against `npm run dev`; cheaper to verify after the Phase C sweep is reviewed.
- **Next Steps**: Human reviews canary + middleware contract.

### Session Note — 2026-04-29
- **Who**: AI Agent (GitHub Copilot, Claude Opus 4.7)
- **Duration**: async
- **Worked On**: Phases A, B, D of Build stage on `feature/40-public-rest-api`.
  - **Phase A**: shipped `lib/utils/api-headers.ts` with `buildResponseHeaders()`, `newRequestId()`, `headersToObject()`. 13-test unit file. Canary integration on `app/api/v1/whoami/route.ts` — emits `X-Request-Id`, `X-API-Version`, `X-RateLimit-*` on 200/429/auth-fail paths.
  - **Phase B**: shipped `checkApiRateLimit()` + `API_PLAN_RATE_LIMITS` in `lib/utils/rate-limit.ts`. Two-tier (per-key + workspace ceiling) plan-aware decision. Existing `rateLimit()` kept as-is for backward compat. 8-test unit file covers both buckets, isolation across keys/workspaces, plan-differentiated limits, and `Retry-After` shape.
  - **Phase D**: wrote `docs/references/api-versioning.md` (Stripe-style additive policy, ≥6-month sunset, full header contract table, multi-version routing strategy). Wrote `docs/references/api-changelog.md` with v1 baseline entry.
- **Stopped At**: End of Phase D. Test counts: 339/339 unit tests passing (was 318 → +21 new). Type-check clean.
- **Blockers**: Phase E (SDK packaging) needs human approval for npm workspace restructure + `@lazynext` org reservation. Phase F (docs page) needs human approval for `@scalar/api-reference` dep. Phase C (full route sweep) intentionally deferred until canary review.
- **Next Steps**: Human reviews canary on `whoami` + the Phase D policy doc. After approval: Phase C sweep, then Phases E/F if external blockers clear.

### Session Note — 2026-04-28
- **Who**: AI Agent (GitHub Copilot, Claude Opus 4.7)
- **Duration**: async
- **Worked On**: Discuss → Design → Plan stages of feature #40 on the `feature/39-doc-cleanup-and-tests` branch (to keep all post-audit doc work in one place until human approval).
- **Stopped At**: End of Plan stage. Branch `feature/40-public-rest-api` not yet created; Build stage requires human approval first (new dependencies: `@scalar/api-reference`; npm `@lazynext` org reservation).
- **Blockers**: Two human-gated approvals before Build can start: (1) confirm `@scalar/api-reference` dependency, (2) reserve `@lazynext` on npm.
- **Next Steps**: Once approvals land — branch `feature/40-public-rest-api` from main, start Phase A (shared response-header utility).

---

## Log

### 2026-04-29 — Build (Phases A, B, D)

- **Added**: `lib/utils/api-headers.ts` — shared response-header builder. Exports `buildResponseHeaders`, `newRequestId`, `headersToObject`, types `ApiVersion`, `RateLimitInfo`, `DeprecationInfo`. RFC 8594 + draft-ietf-httpapi-deprecation-header compliant.
- **Added**: `tests/unit/api-headers.test.ts` — 13 cases covering all branches (rate-limit triplet, retry-after rounding, deprecation header set, negative-remaining clamp).
- **Added**: `checkApiRateLimit()` and `API_PLAN_RATE_LIMITS` in `lib/utils/rate-limit.ts`. Two-tier per-key + workspace decision; rejection picks the binding (stricter) bucket for headers.
- **Added**: `__resetRateLimitStoreForTests()` test-only helper to clear in-memory store between cases.
- **Added**: `tests/unit/api-rate-limit.test.ts` — 8 cases: both bucket exhaustion paths, isolation across keys/workspaces, plan-differentiated limits, `retryAfterSec ≥ 1`.
- **Changed**: `app/api/v1/whoami/route.ts` — canary integration. Bearer requests now flow through plan-aware `checkApiRateLimit`; cookie-session keeps single-bucket. All exit paths emit the contract headers.
- **Added**: `docs/references/api-versioning.md` — full policy doc: Stripe-style additive, lifecycle phases, header contract table, communication plan, decision log.
- **Added**: `docs/references/api-changelog.md` — customer-facing API changelog with v1 baseline.

---

## Deviations from Plan

- **Architecture said `verifyApiKey`; reality is `authenticateApiKey`.** No code in `api-key-auth.ts` needed touching: `lib/utils/route-auth.ts/resolveAuth()` already returns `keyId`, `bearerWorkspaceId`, and `rateLimitId`. Phase B.1 became a no-op; Phase B.2 was a pure addition (`checkApiRateLimit` alongside the existing `rateLimit`).
- **`X-RateLimit-Limit` and `X-RateLimit-Remaining` were not in the existing `rateLimitResponse()`.** Rather than modify that helper (used by non-API code paths), the canary route routes its 429 through `buildResponseHeaders` directly. The legacy `rateLimitResponse()` is still in place; routes migrate one at a time during the Phase C sweep.
- **Task A.2 (Sentry instrumentation tagging) deferred.** `instrumentation.ts` was not modified this session; Sentry currently auto-captures the response headers. Revisit during the Phase C sweep so the request-id is also on `Sentry.setTag` for cross-system correlation.
- **Phase C deferred intentionally.** The architecture doc planned A→B→C as one push, but reviewing `whoami` as a canary first reduces blast radius. The remaining 23 routes will follow once a human signs off on the canary's header contract.

## Key Decisions Made During Build

- **Two-tier helper added alongside, not replacing, `rateLimit()`.** `rateLimit()` is used by AI / auth / webhook / export / mutation buckets that have nothing to do with the public API. Mixing API-specific plan logic into it would have widened the change surface.
- **Test-only store reset is exported.** Two-tier tests need isolation between cases (each fills the store with hundreds of fake entries). Exposing `__resetRateLimitStoreForTests` is cleaner than per-test unique key prefixes.
- **Free + starter plans get the same low API rate-limit bucket.** Free tier doesn't have public-API access at all (gated at `hasFeature`), so the bucket value is unreachable in production. Keeping it populated avoids `undefined` lookups if the feature gate is ever loosened.
