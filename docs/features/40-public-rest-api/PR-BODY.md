# feat(api): Public REST API v1 — header contract, plan-aware rate limits, SDK, docs

Closes #40.

## Summary

Ships the Public REST API surface for Lazynext: a small, honest set of bearer-authenticated endpoints with a Stripe-style versioning policy, a complete response-header contract on every response, plan-aware two-tier rate limiting, a publish-ready typed SDK, and a full public docs site.

**8 commits, 25/27 planned tasks done.** Validation: type-check clean, lint clean, 350/350 unit + integration tests pass.

## What ships

### API contract (every `/api/v1/*` response)

- `X-Request-Id` — preserves upstream client value if present, else freshly minted via `crypto.randomUUID()` in middleware
- `X-API-Version: v1`
- `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`
- On 429: `Retry-After` (clamped ≥ 1s)
- On deprecated routes (none yet): `Sunset` (RFC 8594), `Deprecation: @<unix>`, `Link; rel="deprecation"`

Stamped centrally by `middleware.ts` with non-clobbering merge semantics — routes that set their own contract headers via `buildResponseHeaders()` win.

### Plan-aware two-tier rate limiting

`lib/utils/rate-limit.ts` — `checkApiRateLimit({ keyId, workspaceId, plan })` returns `{ allowed, headers, retryAfterSec, bindingBucket }`.

| Plan | Per-key (rpm) | Per-workspace (rpm) |
|---|---|---|
| free / starter | 60 | 120 |
| pro | 600 | 1 800 |
| business / enterprise | 6 000 | 30 000 |

All 50 existing `rateLimitResponse(rl.resetAt)` call sites swept to emit the full triplet without per-route changes.

### Documentation site

Six new pages under `app/(marketing)/docs/api/`:

- `/docs/api` — endpoint table + quickstart link
- `/docs/api/quickstart` — 4-step first call
- `/docs/api/authentication` — bearer keys, scopes, rotation, audit
- `/docs/api/rate-limits` — plan table, headers, backoff strategy
- `/docs/api/webhooks` — `crypto.timingSafeEqual` snippet, retries, idempotency
- `/docs/api/versioning` — Stripe-style additive policy with lifecycle table
- `/docs/api/changelog` — customer-facing change log

Plus shared `layout.tsx` with sticky sub-nav for lateral navigation. Sitemap updated, README has a Public REST API section.

### SDK packaging

- New `packages/sdk/` directory: `@lazynext/sdk@0.1.0`, MIT, hand-typed client, README, LICENSE, tsconfig.
- `private: true` flag — package physically cannot publish until npm org is reserved and flag is flipped (one-line reversal).
- `lib/sdk/{client,index}.ts` are now re-export shims pointing at `packages/sdk/src/`. All internal imports of `@/lib/sdk/*` keep working unchanged.
- Tarball verified locally via `npm pack --dry-run` — 11 files, 6 kB packed (LICENSE, README, package.json, dist/{client,index}.{js,d.ts,*.map}).
- `prepublishOnly: npm run build` so published artefacts are always fresh.
- `.gitignore` updated to exclude `/packages/*/dist` and `/packages/*/*.tgz`.

### Reference docs

- `docs/references/api-versioning.md` — Stripe-style additive versioning policy, ≥ 6-month sunset window, full header-contract table, multi-version routing strategy.
- `docs/references/api-changelog.md` — internal API change log with v1 baseline.

### Tests

- `tests/integration/api-headers.test.ts` (7 cases) invokes `middleware()` directly with mock `NextRequest`s, asserts contract on `/api/v1/*`, no leakage to marketing routes, ID pass-through, ID uniqueness.
- `tests/unit/api-headers.test.ts` (13 cases) covers `buildResponseHeaders()` edge cases.
- `tests/unit/api-rate-limit.test.ts` (8 cases) covers plan-aware two-tier rate limiting.
- `tests/unit/rate-limit.test.ts` (+4 cases) covers extended `rateLimitResponse({ resetAt, limit, remaining })` signature.

## Commits

```
522be71  feat(docs): sticky sub-nav for /docs/api/* pages (F.2)
08bdf60  chore(sdk): prepublishOnly + gitignore dist + changelog
4b563dd  feat(sdk): extract SDK source to packages/sdk/ as @lazynext/sdk
8b58c37  feat(api): docs pages + integration test + README
7b3470e  feat(api): every 429 emits full X-RateLimit triplet
78dcb06  feat(api): rateLimitResponse accepts { limit, remaining }
fe3ed5f  feat(api): middleware stamps contract headers
8b0b78b  feat(api): foundation — header builder + plan rate limits
```

## Deferred sub-tasks (with reasons)

| Task | Reason |
|---|---|
| **A.2** Sentry on `/api/v1` | Sentry is no-op in this repo today; needs DSN + middleware wiring to be meaningful |
| **E.1** npm workspaces | Adding `workspaces: ["packages/*"]` changes Vercel build behaviour; standalone publishable directory works for v0.1.0 |
| **E.3** physical test file move | `tests/unit/sdk-client.test.ts` still passes via the shim path; vitest globs `tests/**` so moving would break discovery |
| **E.5 / E.6** auto-gen SDK types | Needs `openapi-typescript` dep — crosses dep-approval boundary |
| **E.8** `npm publish` | Package is `private: true`; flip to `false` once `@lazynext` is reserved on npm |
| **F.1 / F.3** Scalar viewer | Needs `@scalar/api-reference` dep — crosses dep-approval boundary |
| **Z.3 / Z.4** project changelog + roadmap → 🟢 Merged | Merge-time tasks |

## How to test locally

```bash
git checkout feature/40-public-rest-api
npm ci
npm run type-check     # clean
npm run lint           # only pre-existing global-error.tsx <img> warning
npx vitest run         # 350 / 350 in 40 files
cd packages/sdk && npm run build && npm pack --dry-run   # 11 files, 6 kB
```

Smoke-test the docs:

```
npm run dev
open http://localhost:3000/docs/api
```

Check the header contract on a real call:

```bash
curl -i http://localhost:3000/api/v1/whoami \
  -H "Authorization: Bearer <key>"
# expect: X-Request-Id, X-API-Version, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

## Post-merge follow-ups

1. Reserve `@lazynext` on npm.
2. Flip `private: true` → `private: false` in `packages/sdk/package.json`.
3. Run `npm publish` from `packages/sdk/`.
4. Approve `@scalar/api-reference` if you want the interactive OpenAPI viewer at `/docs/api`.
5. Update `docs/project-changelog.md` and flip #40 to 🟢 Merged in `docs/project-roadmap.md`.

## Mastery framework notes

Every Build-stage deviation is tracked in `docs/features/40-public-rest-api/changelog.md`. Tasks tracker at `docs/features/40-public-rest-api/tasks.md` shows 25/27 with reasons for the 2 deferred (E.5/E.6 — auto-gen types; F.1/F.3 — Scalar viewer).
