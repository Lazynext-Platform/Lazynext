# 🧪 Test Plan: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Tasks**: [`tasks.md`](tasks.md)
> **Date**: 2026-04-28

---

## Acceptance Criteria

- [ ] Every `/api/v1/*` response includes `X-Request-Id`, `X-API-Version`, and (when applicable) `X-RateLimit-{Limit,Remaining,Reset}`
- [ ] Per-key rate limit returns 429 with `Retry-After` after the bucket is exhausted
- [ ] Workspace ceiling rate limit returns 429 even when individual keys are under their per-key limit
- [ ] `/docs/api` renders the live OpenAPI spec; all 6 supporting pages load
- [ ] `@lazynext/sdk` builds, types correctly, and `npm publish --dry-run` succeeds
- [ ] `lib/sdk/` re-export shim keeps existing internal imports working (no internal regressions)
- [ ] Versioning policy doc exists at `docs/references/api-versioning.md`
- [ ] Webhook page shows a Node verification snippet using `crypto.timingSafeEqual`
- [ ] Deprecation header (`Sunset`, `Deprecation`, `Link`) round-trips through `buildResponseHeaders`

---

## Test Cases

### Rate Limits

| TC | Category | Precondition | Steps | Expected | Status |
|---|---|---|---|---|---|
| **TC-01** | Happy Path | Free-plan key, fresh bucket | Make 1 request | 200 + `X-RateLimit-Remaining: 59` | ⬜ Not Run |
| **TC-02** | Error | Free-plan key | Make 61 requests in 60s | Last → 429 + `Retry-After` set | ⬜ Not Run |
| **TC-03** | Edge | Pro-plan workspace, 3 keys at 500/min each | Total 1500 reqs/min (workspace cap 1800) | All 200 | ⬜ Not Run |
| **TC-04** | Edge | Pro-plan workspace, 3 keys at 700/min each | Total 2100 reqs/min (cap 1800) | First 1800 → 200; rest → 429 | ⬜ Not Run |
| **TC-05** | Security | Revoked key | Any request | 401 (no rate-limit headers leaked) | ⬜ Not Run |
| **TC-06** | Edge | Bucket reset boundary | Wait through reset, retry | 200 + `X-RateLimit-Remaining: 59` | ⬜ Not Run |

### Contract Headers

| TC | Category | Precondition | Steps | Expected | Status |
|---|---|---|---|---|---|
| **TC-07** | Happy Path | Valid key | `GET /api/v1/whoami` | 200 + `X-Request-Id` + `X-API-Version: v1` | ⬜ Not Run |
| **TC-08** | Happy Path | Valid key | Hit every public route once | All return `X-Request-Id` (unique per request) + `X-API-Version` | ⬜ Not Run |
| **TC-09** | Error | Invalid key | `GET /api/v1/decisions` | 401 + `X-Request-Id` (still emitted on errors) | ⬜ Not Run |
| **TC-10** | Edge | Concurrent requests | 10 parallel `GET /api/v1/whoami` | 10 distinct `X-Request-Id` values | ⬜ Not Run |

### SDK

| TC | Category | Precondition | Steps | Expected | Status |
|---|---|---|---|---|---|
| **TC-11** | Happy Path | Tarball from `npm publish --dry-run` | Install in scratch project; `await new LazynextClient({apiKey}).whoami()` | Returns typed `WhoamiResponse`; no `any` types in editor | ⬜ Not Run |
| **TC-12** | Happy Path | SDK source | `client.decisions.list()` | Typed `Decision[]`; matches OpenAPI schema | ⬜ Not Run |
| **TC-13** | Error | SDK + revoked key | Any call | Throws `LazynextApiError` with `code: 'UNAUTHORIZED'` | ⬜ Not Run |
| **TC-14** | Regression | Existing internal `@/lib/sdk` imports | Run full vitest suite | All 318+ tests still pass via shim | ⬜ Not Run |

### Docs Page

| TC | Category | Precondition | Steps | Expected | Status |
|---|---|---|---|---|---|
| **TC-15** | Happy Path | Build deployed | `GET /docs/api` | 200 + Scalar mounts + spec renders | ⬜ Not Run |
| **TC-16** | Happy Path | Build deployed | `GET /docs/api/{quickstart,authentication,rate-limits,webhooks,versioning,changelog}` | All 6 → 200 | ⬜ Not Run |
| **TC-17** | Edge | Theme switcher | Toggle dark/light | Scalar theme follows | ⬜ Not Run |

### Versioning

| TC | Category | Precondition | Steps | Expected | Status |
|---|---|---|---|---|---|
| **TC-18** | Happy Path | Test fixture marks `/api/v1/whoami` deprecated | `GET /api/v1/whoami` | 200 + `Sunset` + `Deprecation` + `Link` headers populated | ⬜ Not Run |

---

## Edge Cases

| # | Scenario | Expected |
|---|---|---|
| 1 | Workspace with zero API keys | API Keys panel shows empty state; no rate-limit calculations |
| 2 | Plan downgrade mid-window (Business → Free) | New limits apply on next bucket reset, not retroactively |
| 3 | Key minted seconds before deletion | First request: 200; second after delete: 401 |
| 4 | Scalar fails to load (CDN down) | Page falls back to a static "View raw spec" link to `/api/v1/openapi.json` |

## Security Tests

| # | Test | Expected |
|---|---|---|
| 1 | Bearer token in URL query string | Rejected — bearer must be in `Authorization` header |
| 2 | API key prefix mismatch (`sk_live_` style) | Rejected with 401 |
| 3 | Workspace-ceiling bypass via 50 keys | Ceiling enforced regardless of key count |
| 4 | Webhook signature with wrong secret | `verifyWebhookSignature` returns false; 401 |
| 5 | OpenAPI spec leak through `/api/v1/openapi.json` | Already public — no schema changes |

## Performance Considerations

| Metric | Target | Actual |
|---|---|---|
| `buildResponseHeaders` overhead | < 0.1ms p99 | — |
| Rate-limit check (per-key + ceiling) | < 1ms p99 | — |
| `/docs/api` initial render (Scalar mount) | < 2s on 4G | — |
| SDK bundle size (gzipped) | < 15KB | — |

---

## Test Summary

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Rate Limits | 6 | — | — | — |
| Contract Headers | 4 | — | — | — |
| SDK | 4 | — | — | — |
| Docs Page | 3 | — | — | — |
| Versioning | 1 | — | — | — |
| Edge Cases | 4 | — | — | — |
| Security | 5 | — | — | — |
| **Total** | **27** | — | — | — |

**Result**: ⬜ NOT RUN
