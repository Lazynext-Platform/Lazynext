# QA Report — localhost:3000 — 2026-04-18

**Branch:** `claude/adoring-shockley-c258cf`
**Base commit (feature ship):** `52afe0c feat: decision intelligence platform (4-dim AI scorer, outcome loop, WMS)`
**QA commits:** 4 fixes + 1 test commit landed
**Test suite:** 14 files / 115 tests passing (was 12 / 95 before QA)
**Health score:** 86 / 100

## Scope

Post-ship QA of the Decision Intelligence Platform transformation (10-step build). Focus areas:

1. New routes: `/d/[slug]` (public decision pages), `/api/v1/workspace/[slug]/wms`
2. New background jobs: `handleOutcomeReminderScan`, upgraded `handleDecisionLogged`, rewritten `handleWeeklyDigest`
3. New marketing stubs: `/careers`, `/contact`, `/docs`
4. New progressive exposure: WMS sidebar gating, `WmsHydrator`
5. New schema: migration `00002_decision_intelligence_spine.sql`

## Approach

Browser-based QA blocked (browse binary exit 137, Chrome MCP not connected in this session). Pivoted to structural QA:

- Route probe via curl against 17 paths
- Self-audit of every new file (scorer, inngest functions, public page, WMS endpoint, hydrator, sidebar)
- DB schema verification via grep + type file alignment
- Regression tests locking new behavior

## Issues found and fixed

### ISSUE-001 — Broken CTA links (404) — `cbb1ab3`
Severity: **medium** (every CTA in 3 new pages was dead)

`/careers`, `/contact`, `/docs`, `/d/[slug]` all linked to `/signup`. Real route is `/sign-up` (Clerk-style catch-all at `app/(auth)/sign-up/[[...sign-up]]/page.tsx`). Probe confirmed `/signup → 404`. Updated 4 link sites across 3 files.

### ISSUE-002 — Decision scorer silently falling back to heuristic — `8746db7`
Severity: **high** (headline AI feature degraded to math)

`scoreDecision()` called `JSON.parse(ai.content)` directly. Llama via Groq frequently wraps JSON in ```` ```json ... ``` ```` fences despite the explicit "no markdown" prompt instruction. Every fenced response threw, caught, and fell back to heuristic — meaning the "AI scores on 4 dimensions" claim was routinely served by regex counting.

Added `extractJson()` that strips ``` fences and isolates the outermost `{...}` from prose-wrapped responses. Clamps out-of-range dimension values to [0, 100]. Covered by 7 new unit tests.

### ISSUE-003 — 7-second page loads when env is placeholder — `aaa0fa3`
Severity: **high** (first-run UX was broken)

`hasValidDatabaseUrl` only rejected URLs containing the literal substring `placeholder`. Stock `.env.local` ships with `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co` — which slipped through. Every DB-touching route (`/d/[slug]`, `/workspace/*`, WMS GET) hung for ~7.6s waiting for DNS to fail, then returned a response. Measured impact:

| Route | Before | After |
|-------|--------|-------|
| `/d/nonexistent-slug` | 7.63s | 0.51s |
| `/workspace/demo` | 7.72s | 0.24s |
| `/workspace/demo/decisions` | 7.63s | 0.19s |

Fix: pattern-match known placeholder tokens (`your-project`, `your-service-role`, `your-anon-key`, `example.supabase.co`, `placeholder`) and treat any match as unset. Same logic applied to Groq/Together API keys — a key set to literal `placeholder` now counts as unset and never wastes a 10s network timeout.

## Route probe — final state

```
/                                             200
/pricing                                      200
/contact                                      200
/careers                                      200
/docs                                         200
/about                                        200
/blog                                         200
/privacy                                      200
/terms                                        200
/sign-in                                      200
/sign-up                                      200
/d/nonexistent-slug                           404  ← correct notFound()
/api/v1/decisions                             401  ← correct auth guard
/api/v1/workspace/demo/wms                    401  ← correct auth guard
/workspace/demo                               200
/workspace/demo/decisions                     200
/workspace/demo/decisions/outcomes            200
```

Zero 500s. Every expected auth/notFound boundary enforced.

## Self-audit notes (new code)

**`lib/ai/decision-scorer.ts`** — Solid after ISSUE-002 fix. Heuristic fallback path is defensible; clamping is correct. Model version tag includes provider for downstream analytics.

**`lib/inngest/functions/index.ts`** — `handleOutcomeReminderScan` correctly uses `auth.admin.getUserById` for email lookup (workspace_members has no email column). Still-stamps-on-failure pattern prevents daily re-notification storms when Resend is down. Same pattern in `handleWeeklyDigest` (fixed in prior session).

**`app/d/[slug]/page.tsx`** — `revalidate = 300` is appropriate for opt-in public pages. `generateMetadata` wires OG tags correctly. Dimension breakdown bars gracefully handle null breakdown (hero renders without grid). Auth-free path only returns rows where `is_public = true AND public_slug = $1` — safe.

**`app/api/v1/workspace/[slug]/wms/route.ts`** — Auth-before-lookup ordering correct. `maybeSingle()` used everywhere (not `single()`) so missing rows return 404 cleanly instead of throwing. `hasValidDatabaseUrl` fallback returns `score: 100, layer: 4` which is the right posture for dev ("show everything").

**`lib/wms.ts`** — Thresholds (15/35/60) are tunable via constants; `isFeatureUnlocked` has a switch that cleanly maps features → layers. `incrementWmsFor` clamps [0, 100] and handles missing row by defaulting to 0 on read. All 11 new tests pass.

**`components/layout/Sidebar.tsx`** — Pre-hydration `visibleNavItems` optimistically shows everything (no layout shift risk). Once `wmsLoaded` flips, items filter without re-mount. "Show all N sections" button updates local store *before* awaiting the PATCH, so the UI never blocks on a network request.

## Migration state

`00002_decision_intelligence_spine.sql` schema alignment with `lib/db/schema.ts` verified for all new columns:

- `decisions`: `expected_by`, `score_breakdown`, `is_public`, `public_slug`, `score_model_version`, `score_rationale`, `outcome_reminder_sent_at` ✓
- `workspaces`: `wms_score`, `wms_updated_at`, `power_user_override` ✓
- `nodes`: `decision_id`, `operational_reason` + `nodes_decision_spine_check` constraint ✓

Live DB verification deferred — the user's `.env.local` currently holds placeholder values, so a direct Supabase REST probe wasn't possible. Once real keys are set, migration will auto-apply on first `supabase db push` or equivalent.

## What's explicitly not covered

- **Visual QA** — Chrome MCP not connected, browse binary crashes (exit 137). Rendered HTML was grepped for title/auth markers but no pixel-level review.
- **Auth-gated API flows** — `/api/v1/decisions` POST/PATCH, `/api/v1/decisions/outcomes`, WMS PATCH. All return 401 unauthenticated (correct); behind-auth behavior relies on existing integration test mocks.
- **Real LLM response shapes** — Groq/Together responses are mocked in tests. Live AI scoring quality wasn't validated (user's AI keys are also placeholder).
- **E2E tests in `tests/e2e/`** — Playwright suite wasn't invoked in this pass; those are slower and needed for the next layer of verification.

## Recommendations

1. **Before real deploy:** swap `.env.local` to real Supabase + Groq keys, run `supabase db push` to apply migration 00002, then re-run this probe to confirm the `/d/[slug]` + WMS paths work end-to-end with live data.
2. **Add E2E coverage for `/d/[slug]`** — a Playwright test that seeds a public decision and hits the page would close the biggest remaining gap.
3. **Monitor `score_model_version` distribution** after launch — a sudden spike in `heuristic:v1` vs `groq:llama-3.3-70b-v2:groq` indicates the LLM is returning unparseable output again.

## Health score breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Route integrity | 95 | 17/17 routes return correct codes. One dead-link class caught. |
| Code correctness | 85 | Self-audit clean; two real bugs fixed in new/existing code. |
| Test coverage | 85 | +20 tests on 2 new critical modules (WMS + scorer). E2E not run. |
| Performance | 95 | 7.6s → 0.2s on every DB-touching page in dev. |
| Visual QA | 60 | Not performed. Blocker: browser tooling. |
| **Overall** | **86** | Production-viable for structural; visual pass still owed. |

---

**QA commits:**
```
7d5302d test(qa): add regression coverage for WMS gating + decision scorer JSON parsing
aaa0fa3 fix(qa): ISSUE-003 — reject common placeholder values for Supabase URL + API keys
8746db7 fix(qa): ISSUE-002 — strip markdown fences + surrounding prose before JSON.parse in decision scorer
cbb1ab3 fix(qa): ISSUE-001 — update /signup links to /sign-up (real route)
```
