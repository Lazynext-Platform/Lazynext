# API Versioning Policy

**Status:** ACTIVE
**Last reviewed:** 2026-04-29
**Owner:** Platform team
**Applies to:** `app/api/v1/**` and any future `app/api/v2/**`

---

## TL;DR

Lazynext follows a **Stripe-style additive versioning** policy. We add new
versions without removing the old; consumers migrate at their own pace
within a guaranteed window.

- **Current version:** `v1`
- **Path prefix:** `/api/v1/...` (server) and `https://lazynext.com/api/v1/...` (public)
- **Sunset window:** ≥ 6 months after a version is marked deprecated
- **Header contract:** `X-API-Version`, `X-Request-Id`, `X-RateLimit-*`,
  `Sunset`, `Deprecation`, `Link` (per RFC 8594 + draft-ietf-httpapi-deprecation-header)

---

## What counts as a breaking change

Any of the following requires a **new major version** (`v2`, `v3`, ...):

- Removing a field from a response payload
- Renaming a field, query param, or path
- Changing the type of a field (`string` → `number`)
- Tightening validation (a request that worked before now 400s)
- Changing the **meaning** of a value (enum reused for a new state)
- Changing default behaviour (`limit` default goes from 50 → 25)
- Changing authentication / authorization semantics for an endpoint
- Removing a scope or splitting one scope into many

The following are **non-breaking** and ship within the current major:

- Adding new fields to response payloads (clients must ignore unknown fields)
- Adding new optional query params or body fields
- Adding new endpoints
- Adding new enum values **only when the schema documented "this list may grow"**
- Loosening validation (a request that 400d before now 200s)
- Adding new scopes (existing keys keep their existing scopes)

> **Rule of thumb:** if a well-behaved consumer's code would crash, panic,
> or silently misbehave when receiving the new response, it's breaking.

---

## Lifecycle of a version

```
PLANNED → ACTIVE → DEPRECATED → SUNSET → REMOVED
```

| Phase        | Duration | Behaviour |
|--------------|----------|-----------|
| `PLANNED`    | up to 4 weeks | Spec drafted in `docs/features/40-public-rest-api`. No code yet. |
| `ACTIVE`     | indefinite    | Default version. `X-API-Version` header reflects this. |
| `DEPRECATED` | ≥ 6 months    | Endpoint still works. `Sunset` + `Deprecation` + `Link` headers added. Customer-facing announcement in `api-changelog.md`. |
| `SUNSET`     | (the date itself) | Final 24h. We email all keys that have hit deprecated endpoints in the last 30 days. |
| `REMOVED`    | —             | Endpoint returns `410 Gone` with a `Link` to the migration doc. |

The 6-month window is **a floor, not a ceiling.** Most deprecations should
run 9–12 months. We only shorten to 6 if security or correctness demands.

---

## Header contract

Every `/api/v1/*` response carries:

| Header              | Always present? | Notes |
|---------------------|-----------------|-------|
| `X-Request-Id`      | yes             | UUID v4. Quote in support tickets. Propagated to Sentry. |
| `X-API-Version`     | yes             | `v1` today |
| `X-RateLimit-Limit` | when rate-limited | Integer requests per window |
| `X-RateLimit-Remaining` | when rate-limited | Clamped ≥ 0 |
| `X-RateLimit-Reset` | when rate-limited | Unix-seconds |
| `Retry-After`       | only on 429     | Seconds |
| `Sunset`            | only when deprecated | RFC 8594 HTTP-date |
| `Deprecation`       | only when deprecated | `@<unix-seconds>` (deprecation timestamp) |
| `Link`              | only when deprecated | `<url>; rel="deprecation"` pointing to migration |

Implemented by `lib/utils/api-headers.ts`. Builders MUST go through
`buildResponseHeaders()` — do not hand-roll headers per route.

---

## Multi-version routing strategy

When `v2` ships:

1. New routes live at `app/api/v2/<resource>/route.ts` and import
   their own handlers.
2. `v1` routes are **not modified.** They stay as-is until sunset.
3. Shared business logic moves into `lib/data/*` or `lib/api-handlers/*`
   — versioned routes are thin adapters.
4. `X-API-Version` reflects the path the request came in on.
5. SDK ships dual clients (`LazynextV1Client`, `LazynextV2Client`) for
   one minor version, then the major SDK rev pivots to `v2` as default.

---

## Communication

- **Deprecation announcement:** `docs/references/api-changelog.md` entry,
  email to all keys that hit the endpoint in the last 30 days, banner in
  `/docs/api`.
- **Sunset reminder:** email at T-90, T-30, T-7, T-1 days.
- **Removal:** email at T-0. Endpoint returns `410 Gone`.

The 30-day usage check uses the `api_key_usage` table; if that table
isn't populated for an endpoint, **default to email-all-keys** rather
than skip the announcement.

---

## Decision log

- **2026-04-28** — Chose Stripe-style additive over date-pinned
  (`Lazynext-Version: 2026-04-01`). Date-pinned is more flexible but
  has higher cognitive load for consumers and a worse SDK story for
  small teams. Revisit when our consumer count crosses ~1k orgs.
- **2026-04-28** — 6-month sunset floor. GitHub uses 24 months which
  is great for stability but slow for a startup; Stripe uses
  multi-year for breaking and weeks for additive. 6 months is the
  shortest window that doesn't punish CI-heavy consumers running
  monthly cadence.
