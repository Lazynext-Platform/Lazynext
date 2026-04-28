# 💬 Discussion: Public REST API & SDK (formalization)

> **Feature**: `40` — Public REST API & SDK
> **Status**: 🟡 IN PROGRESS — DRAFT
> **Branch**: not yet created (awaiting human approval to promote from backlog)
> **Depends On**: #03 Auth Pages (for API key issuance UX), #13 Billing (plan-gated rate limits)
> **Date Started**: 2026-04-28
> **Date Completed**: —

---

## Summary

Lazynext already ships the *machinery* of a public REST API — `app/api/v1/*` route handlers, an `api_keys` table with hashed-secret storage in `lib/data/api-keys.ts`, bearer-token verification in `lib/utils/api-key-auth.ts`, an `app/api/v1/openapi.json` spec endpoint, and a typed `LazynextClient` SDK at `lib/sdk/`. What it *doesn't* ship is a coherent public **product** wrapped around those pieces: documented endpoint surface, versioning policy, plan-gated rate limits, scope semantics, deprecation policy, and a developer-facing landing page on `lazynext.com/docs/api`.

This feature does **not** add a new API. It promotes the existing internal API to a first-class public product.

---

## Functional Requirements

- As a **third-party integrator**, I want a stable, documented REST API with bearer-token auth so I can build automations against my Lazynext workspace from outside the UI.
- As a **workspace owner**, I want to mint and rotate scoped API keys from Settings → Integrations → API Access so I can grant least-privilege access to integrations and CI scripts.
- As a **Lazynext maintainer**, I want a written versioning + deprecation policy so I can evolve the API without silently breaking customers.
- As a **developer**, I want a typed SDK published to npm (`@lazynext/sdk`) so I can integrate without writing fetch wrappers.
- As a **billing admin**, I want per-plan rate limits applied to API keys so the public API doesn't become an unmonetized firehose.

## Current State / Reference

### What Exists

- **Routes**: `app/api/v1/{whoami,decisions,nodes,edges,workflows,workspaces,workspace,threads,notifications,notification-preferences,automations,templates,export,import,search,audit-log,api-keys,billing,oauth,webhooks,onboarding,ai}/` — already real handlers, already use `verifyApiKey` from `lib/utils/api-key-auth.ts` for bearer requests.
- **OpenAPI spec endpoint**: `app/api/v1/openapi.json/route.ts` (verified by [`tests/unit/openapi.test.ts`](../../../tests/unit/openapi.test.ts), 8 cases).
- **API key storage**: `api_keys` table; `mintApiKey` / `hashApiKey` in [`lib/data/api-keys.ts`](../../../lib/data/api-keys.ts); scopes already modeled (`normalizeScopes`, `ApiKeyScope`).
- **Bearer auth utility**: [`lib/utils/api-key-auth.ts`](../../../lib/utils/api-key-auth.ts) — verified by [`tests/unit/api-key-auth.ts`](../../../tests/unit/api-key-auth.test.ts).
- **Rate limiting**: [`lib/utils/rate-limit.ts`](../../../lib/utils/rate-limit.ts) — already covered by `tests/unit/rate-limit.test.ts`.
- **Typed SDK**: [`lib/sdk/client.ts`](../../../lib/sdk/client.ts) — `LazynextClient`, typed errors (`LazynextApiError`), `WhoamiResponse`, decision CRUD; verified by `tests/unit/sdk-client.test.ts`.
- **Plan gating**: [`lib/utils/plan-gates.ts`](../../../lib/utils/plan-gates.ts) — already groups features by plan; API access is currently gated to **Business+**.
- **UI**: API Keys panel exists at Settings → Integrations (rendered behind plan gate).

### What Works Well

- Internal API surface is already comprehensive (24 route folders).
- Hashed key storage + scope model are right.
- OpenAPI spec is generated, not hand-written, so it can't drift.
- The SDK layer already exists and is tested — we don't need to *build* one, we need to *publish* one.

### What Needs Improvement

1. **No public docs page.** The `/docs/api` slug is empty. Customers have no entry point.
2. **OpenAPI spec is internal.** Served at `/api/v1/openapi.json` but not advertised, not version-locked, no Redoc/Swagger UI render.
3. **SDK isn't published.** `lib/sdk/` is a tsconfig-path import only; no `@lazynext/sdk` on npm.
4. **No versioning/deprecation policy.** The `/v1/` prefix exists but nothing enforces it. There's no `Sunset` header convention, no migration window, no changelog for the API itself.
5. **Rate-limit policy is implicit.** The middleware is real, but the limits aren't documented per-plan.
6. **No request-id / observability for external callers.** Internal Sentry tagging works, but customers can't quote a request ID when filing a support ticket.
7. **Webhooks are listed as a route but not a documented product** (`app/api/v1/webhooks`) — needs payload schema, signature verification example, retry policy.

## Proposed Approach

This feature is **product packaging**, not engineering. It splits naturally into 4 horizontal layers:

1. **Documentation layer** — A real `/docs/api` route on the marketing surface. Auto-renders the existing OpenAPI spec via Redoc (or Scalar). Authoring guide for keys, scopes, rate limits, versioning, webhooks, and the SDK quickstart.
2. **Versioning + deprecation policy** — Written in `docs/references/api-versioning.md`. Adds `X-API-Version` and `Sunset` header support to `lib/utils/api-key-auth.ts`. Encodes the rule: minor changes are additive; breaking changes bump `/v2/` and live alongside `/v1/` for ≥6 months.
3. **Rate-limit transparency** — Per-plan limits documented in the docs page. `Retry-After` + `X-RateLimit-{Limit,Remaining,Reset}` headers added consistently. Limits enforced via existing `lib/utils/rate-limit.ts`.
4. **SDK publish** — Move `lib/sdk/` to a publishable subpackage (or a separate repo). First public release `@lazynext/sdk@0.1.0`. README with quickstart + every route covered by an SDK method.

The implementation budget is small *because* the engine already exists. Most of the work is writing prose, not code.

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Feature #03 — Auth Pages | Feature | ✅ Done |
| Feature #13 — Billing & Subscription | Feature | ✅ Done — needed for plan-gated rate limits |
| Feature #31 — Integrations Settings | Feature | ✅ Done — already hosts API Keys panel |
| `redoc-cli` or `@scalar/api-reference` | External | 🔴 Needs human approval — new dependency |
| npm publish access for `@lazynext` org | Infrastructure | 🔴 Needs human setup |
| `@lazynext/sdk` package name | External | 🔴 Needs reserve on npm |

## Research & Prior Art

### Knowledge Gaps

- [ ] Should the docs page render via Redoc, Scalar, or a custom Lazynext-themed renderer? (Aesthetic + bundle-size tradeoff.)
- [ ] Webhook signature scheme — HMAC-SHA256 with `X-Lazynext-Signature` is the obvious choice but should be confirmed against any existing convention in `app/api/v1/webhooks/`.
- [ ] SDK release pipeline — manual `npm publish` from a release branch, or via a GitHub Action gated on tag push?

### Sources Consulted

| Source | Type | Key Takeaway |
|---|---|---|
| Stripe API docs | Competitor | Sunset header + 6-month deprecation window is the gold standard. |
| Linear API docs (Scalar-rendered) | Competitor | Scalar render is faster than Redoc, supports try-it-now without a backend. |
| OpenAI Node SDK README | Competitor | "30 seconds to first call" quickstart matters more than reference completeness. |

### Key Findings

- We don't need to invent any policy — Stripe-style versioning + Linear-style docs UI + OpenAI-style quickstart is the well-trodden path.
- Customers expect the SDK and the API to ship together; un-versioned drift between them is the #1 complaint in DX surveys.

### Impact on Decisions

- Versioning: chosen → **Stripe-style** (`/v1/` prefix; `/v2/` lives alongside; 6-month sunset).
- Docs renderer: leaning toward **Scalar** (smaller bundle, supports the marketing site's dark/light theme switcher).
- SDK release cadence: **synchronous with API minor versions** — every API change ships an SDK release.

## Open Questions

- [ ] Are we okay reserving `@lazynext` on npm now even if SDK release is later?
- [ ] Does the docs page belong under the marketing route group (`(marketing)/docs/api/`) or the app shell? (Marketing — public docs shouldn't require auth.)
- [ ] Webhooks: do we ship the consumer-facing signature verification snippet in 4 languages (Node/Python/Ruby/Go) or only Node?
- [ ] Rate limits: enforce per-key or per-workspace? (Probably per-key, with a workspace ceiling.)

## Decisions Made

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-28 | Promote backlog item to numbered feature `#40` | Strategic enabler for OAuth adapters (#15/#31), AI workflow gen, and PDF export — formalizing first multiplies leverage. |
| 2026-04-28 | Scope is *packaging*, not new endpoints | All 24 route folders already exist + are tested; pretending this is a "build" would inflate it artificially. |
| 2026-04-28 | Version pinning at `/v1/` stays | Already shipped; no good reason to rewrite. |
| 2026-04-28 | Scalar over Redoc for the docs page | Bundle size + theme support; tentative — confirm during architecture stage. |

## Discussion Complete ✅

_To be marked complete by a human after open questions are resolved and the npm/dependency approvals come in._

**Next** (when complete): Create [architecture.md](architecture.md) → break out per-layer file structure (docs page, versioning headers, SDK packaging, rate-limit response shape).
