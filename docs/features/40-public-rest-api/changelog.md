# 📝 Changelog: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Branch**: `feature/40-public-rest-api` (not yet created)
> **Started**: 2026-04-28
> **Completed**: —

---

## Session Notes

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
