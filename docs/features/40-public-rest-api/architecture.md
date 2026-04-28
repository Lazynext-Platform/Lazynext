# 🏗️ Architecture: Public REST API & SDK

> **Feature**: `40` — Public REST API & SDK
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟡 DRAFT
> **Date**: 2026-04-28

---

## Overview

Four-layer packaging of the existing internal REST API. **No new product endpoints** — all 24 route folders under `app/api/v1/*` are already wired and tested. This feature adds: (1) a public Scalar-rendered docs page, (2) versioning + deprecation headers via shared middleware, (3) standard rate-limit response headers, (4) an `@lazynext/sdk` npm package built from the existing `lib/sdk/` source.

## File Structure

```
app/(marketing)/docs/api/
├── page.tsx                              # NEW — Scalar reference page (server component)
├── layout.tsx                            # NEW — wraps with marketing chrome (light theme)
├── quickstart/page.tsx                   # NEW — "30 seconds to first call" guide
├── authentication/page.tsx               # NEW — bearer tokens, scopes, key rotation
├── rate-limits/page.tsx                  # NEW — per-plan limits table + headers reference
├── webhooks/page.tsx                     # NEW — payload schema + Node verification snippet
├── versioning/page.tsx                   # NEW — Stripe-style policy + Sunset/Deprecation headers
└── changelog/page.tsx                    # NEW — auto-rendered from docs/references/api-changelog.md

lib/utils/
├── api-key-auth.ts                       # MODIFY — emit X-RateLimit-* + Sunset headers via shared helper
├── api-headers.ts                        # NEW — buildResponseHeaders() shared by every /api/v1/* route
└── rate-limit.ts                         # MODIFY — accept (apiKey, workspace) tuple, enforce ceiling

app/api/v1/
└── (no new routes; all existing route handlers updated to call buildResponseHeaders)

docs/references/
├── api-versioning.md                     # NEW — written policy (Stripe-style, 6-month sunset)
└── api-changelog.md                      # NEW — semver-tagged log of every API change going forward

packages/sdk/                             # NEW — extracted from lib/sdk/
├── package.json                          # name: @lazynext/sdk, version: 0.1.0
├── tsconfig.json                         # composite: true, declaration: true
├── README.md                             # quickstart + every endpoint covered
├── src/
│   ├── index.ts                          # re-exports from client.ts
│   ├── client.ts                         # MOVED from lib/sdk/client.ts (no behavior change)
│   └── types.ts                          # NEW — generated from openapi.json
└── tests/
    └── client.test.ts                    # MOVED from tests/unit/sdk-client.test.ts

lib/sdk/                                  # KEEP as a thin re-export shim
├── client.ts                             # MODIFY — re-export from packages/sdk for path-alias compat
└── index.ts                              # unchanged

scripts/
└── generate-sdk-types.ts                 # NEW — pulls /api/v1/openapi.json, runs openapi-typescript, writes packages/sdk/src/types.ts
```

## Data Model

**N/A — this feature does not introduce data models.** The `api_keys` table already exists ([`lib/data/api-keys.ts`](../../../lib/data/api-keys.ts)); no schema migrations.

## Component Design

### `lib/utils/api-headers.ts` (new)

**Responsibility**: Centralize API response headers so every route emits the same versioning + rate-limit + request-id contract. Internal-only utility — not exported through the SDK.

```
buildResponseHeaders(input: {
  rateLimit?: { limit: number; remaining: number; reset: number }   // → X-RateLimit-Limit/Remaining/Reset
  retryAfterSeconds?: number                                         // → Retry-After (set on 429 only)
  apiVersion?: 'v1' | 'v2'                                           // → X-API-Version (default 'v1')
  deprecation?: { sunsetDate: Date; deprecationDate: Date; link: string }   // → Sunset + Deprecation + Link
  requestId: string                                                  // → X-Request-Id (uuid)
}): Headers
```

### `lib/utils/api-key-auth.ts` (modify)

**Responsibility**: Existing `verifyApiKey` stays. Adds a new return field `rateLimitContext: { keyId, workspaceId }` so the rate-limit module can apply the per-key + workspace-ceiling rule without re-querying.

### `lib/utils/rate-limit.ts` (modify)

**Responsibility**: Switch from single-bucket-per-key to **two-tier check**:

```
checkRateLimit({ keyId, workspaceId, plan }):
  1. Per-key bucket: { Free: 60/min, Pro: 600/min, Business: 6000/min }
  2. Workspace ceiling: { Free: 120/min, Pro: 1800/min, Business: 30000/min }
  → return { allowed, limit, remaining, resetAt, headers }
  → reject if EITHER bucket exhausted
```

Limits are derived from existing `lib/utils/plan-gates.ts` — no new config file.

### `app/(marketing)/docs/api/page.tsx` (new)

**Responsibility**: Render the OpenAPI spec via `@scalar/api-reference`. Server component — fetches `/api/v1/openapi.json` at build time, passes to a client wrapper that mounts Scalar.

```
ApiDocsPage (server)
└── ScalarReference (client, dynamic import) ─── @scalar/api-reference
                                              └── theme: 'lazynext-dark' / 'lazynext-light' (matches marketing toggle)
```

### `packages/sdk/` (new package)

**Responsibility**: Publishable npm package. Source lives here; `lib/sdk/` becomes a re-export shim so internal imports (`@/lib/sdk`) keep working.

```
@lazynext/sdk
├── LazynextClient(opts: { apiKey, baseUrl?, fetch? })
├── client.decisions.{list, create, update, delete}
├── client.nodes.{list, create, update, delete, batchUpdatePositions}
├── client.workflows.{list, get, create}
├── client.workspaces.{list, current}
├── client.whoami()
└── LazynextApiError
```

Generated types from `scripts/generate-sdk-types.ts` populate `packages/sdk/src/types.ts` so the SDK can never drift from the OpenAPI spec.

## Data Flow

```
[Customer code]
   │ const client = new LazynextClient({ apiKey: 'lz_...' })
   │ await client.decisions.list({ workspaceId })
   ▼
[@lazynext/sdk]                                                — fetch wrapper, typed
   │ Authorization: Bearer lz_...
   │ X-Lazynext-SDK-Version: 0.1.0
   ▼
[Next.js /api/v1/decisions/route.ts]
   │ verifyApiKey()        → { keyId, workspaceId, scopes }
   │ checkRateLimit()      → per-key + workspace ceiling
   │ buildResponseHeaders() → X-RateLimit-* + X-API-Version + X-Request-Id (+ Sunset if applicable)
   │ existing handler logic …
   ▼
[Response]
   200 OK
   X-API-Version: v1
   X-Request-Id: 0f2b…
   X-RateLimit-Limit: 600
   X-RateLimit-Remaining: 597
   X-RateLimit-Reset: 1745842800
```

For a deprecated route (`/v1/foo` after `/v2/foo` ships):

```
[Response]
   200 OK
   Sunset: Wed, 01 Oct 2026 00:00:00 GMT
   Deprecation: @1745842800
   Link: <https://lazynext.com/docs/api/changelog#v2>; rel="deprecation"
```

## Configuration

| Key | Value/Type | Description |
|---|---|---|
| `LAZYNEXT_API_BASE_URL` | string | Already exists; used by SDK default `baseUrl`. |
| `NEXT_PUBLIC_API_DOCS_THEME` | string | `'auto' \| 'dark' \| 'light'` — controls Scalar default theme. Defaults to `'auto'`. |

No new server-side env vars. Rate-limit thresholds live in code (`lib/utils/plan-gates.ts`) — code, not config, because they're tied to the plan model.

## Security Considerations

- **Bearer-token bypass**: `verifyApiKey` already enforces hashed-secret comparison; not weakened.
- **Rate-limit exhaustion attack**: workspace ceiling caps the blast radius. A customer minting 100 keys cannot exceed the workspace limit.
- **Webhook signature**: HMAC-SHA256 with a per-workspace secret stored hashed in `oauth_connections.signing_secret_hash` (already-existing column). Verification snippet in docs uses `crypto.timingSafeEqual`.
- **CORS**: API routes stay same-origin only for v1; CORS for cross-origin SDK use is a v2 concern.
- **OpenAPI spec leakage**: `/api/v1/openapi.json` is already public; no change.

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Scalar-rendered docs** (chosen) | Smaller bundle than Redoc; theme-aware; faster TTFI | Newer project; smaller community | ✅ Selected |
| Redoc-rendered docs | Battle-tested; widely used | ~3× bundle weight; ugly default theme | ❌ |
| Hand-written docs (MDX) | Maximum control over copy + examples | Drifts from API; double-maintenance burden | ❌ |
| **`packages/sdk/` workspace package** (chosen) | Independent versioning; single source of truth | One-time setup cost (workspaces config) | ✅ Selected |
| Separate `@lazynext/sdk` repo | Total isolation | CI duplication; release coordination overhead | ❌ Rejected for v1; revisit at v2.0 |
| Inline SDK in monorepo (status quo) | Zero setup | Can't `npm install`; can't version independently | ❌ Status quo blocks the goal |

## Next

Create [`tasks.md`](tasks.md) and [`testplan.md`](testplan.md).
