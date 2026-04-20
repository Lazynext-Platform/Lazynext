# Changelog

All notable changes to Lazynext will be documented in this file.

## [Unreleased]

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
