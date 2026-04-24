# Changelog

All notable changes to Lazynext will be documented in this file.

## [Unreleased]

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
