# PR: Gumroad migration + per-seat pricing + trial + paywall

**Branch:** `feature/billing-gumroad-migration` → `main`
**Open PR:** https://github.com/Lazynext-Platform/Lazynext/pull/new/feature/billing-gumroad-migration
**Size:** 50 files changed · ~+1,900 / −2,690 · 9 commits
**Version bump:** 1.0.0.1 → 1.1.0.0
**Tests:** 133 passing (+14 since `main`) · type-check clean

---

## Why this PR exists

The app shipped with Lemon Squeezy as the billing provider and flat-workspace pricing ($9/$19/$49). Two problems:

1. **Lemon Squeezy is no longer the right provider** — we're replacing it with Gumroad for simpler payouts, no EU VAT overhead, and one-click product creation.
2. **Flat-workspace pricing leaves money on the table** — teams growing from 3 → 15 members pay the same $9. Per-seat pricing is the industry standard and scales with value delivered.

This PR is a full rip-and-replace of the billing surface *and* a pricing redesign — done in one branch because the Gumroad product URLs, plan tiers, and checkout flow all have to change together.

---

## What ships in this PR

### 1. Gumroad replaces Lemon Squeezy (commit `1097283`)
- New `/api/v1/webhooks/gumroad/[secret]` route with URL-path-secret auth (timing-safe compare; Gumroad doesn't sign pings). Handles `sale`, `subscription_updated/_ended/_cancelled/_restarted`, `refunded`, `dispute`.
- `/api/v1/billing/checkout` builds a Gumroad product URL with `workspace_id`/`user_id`/`plan`/`interval` embedded as query params so the ping echoes them back as `url_params[...]`.
- `/api/v1/billing/portal` returns the derived `app.gumroad.com/subscriptions/<id>/manage` URL.
- DB migration renames `ls_*` columns → `gr_*`.
- `@lemonsqueezy/lemonsqueezy.js` removed (−57 transitive packages).
- CSP `connect-src` swapped to `app.gumroad.com` + `api.gumroad.com`.

### 2. Per-seat pricing + Founding Member (commit `5b54a57`)

| Plan slug | Display | Monthly | Annual (per seat/mo) |
|---|---|---|---|
| `free` | Free | — | — |
| `starter` | **Team** | $12/seat | $10/seat |
| `pro` | **Business** (highlighted) | $24/seat | $20/seat |
| `business` | **Enterprise** | Custom | Custom |

- All paid tiers: unlimited members/nodes/workflows.
- AI query caps: Free 10, Team 100, Business 500, Enterprise unlimited (all per seat per day).
- **Founding Member**: first 100 paying workspaces get 30% off for life.
- Slug → display mapping was kept so no DB enum migration was needed.

### 3. 14-day trial cron + live counter (commit `1b4acf0`)
- `handleTrialExpiryScan` Inngest cron at `0 2 * * *` downgrades expired unpaid trials.
- `/api/v1/billing/founding-member` returns `{ cap, claimed, remaining, open }` — claimed counts workspaces with a non-null `gr_subscription_id`.
- Pricing page banner renders live "{N} of 100 spots left", hides when closed.

### 4. Webhook integration tests (commit `047478c`)
14 tests, one file (`tests/integration/gumroad-webhook.test.ts`), zero flakes. Covers:
- Auth: wrong secret, length mismatch (timing-safe path), missing env
- Sale: happy path, default-plan fallback, missing workspace_id no-op
- Lifecycle: cancelled/ended/refunded/dispute → free; updated/restarted → refresh manage URL only
- Idempotency: 23505 on `webhook_events` → `{duplicate: true}` ack
- Unknown resource → 200 with no mutations

### 5. Upgrade modal wired end-to-end (commit `ab0c463`)
- Rewritten against new pricing; prices imported from `constants.ts` (no drift with pricing page).
- 7 variants with contextual banner copy: `node-limit`, `ai-limit`, `member-limit`, `health-gate`, `automation-gate`, `sso-gate`, `full-upgrade`.
- Per-button loading spinner, error toast on billing-endpoint failure.
- `stores/upgrade-modal.store.ts` — global trigger: `useUpgradeModal.getState().show('health-gate')`.
- `<UpgradeModalHost />` mounted once in workspace layout.
- Sidebar CTA: "Upgrade to Pro" → "Upgrade" (tier-agnostic).

### 6. Architecture reference doc (commit `ce96eee`)
[`docs/references/billing-architecture.md`](docs/references/billing-architecture.md) — 311 lines, 8 sections. Plan model, runtime flow, webhook handling, DB schema, env vars, 10-step Gumroad setup checklist, file map, v1 non-goals. Replaces needing to grep 15+ files to understand the billing surface.

### 7. Paywall on gated pages (commit `b60350d`)
`<FeatureGate>` wrapper — renders children if plan unlocks the feature, else a paywall card with "Upgrade to <Tier>" CTA. Applied to:
- `/workspace/<slug>/decisions/health` (Decision Health Dashboard)
- `/workspace/<slug>/automations` (Automations)
- `/workspace/<slug>/pulse` (PULSE Dashboard — new `pulse` feature key)

Pattern used is non-invasive — rename the original default to `*Inner`, wrap with `FeatureGate` in a new default. Zero changes to page internals.

---

## Deployment runbook (do in this order)

> **1. Gumroad** — create account → create 4 subscription products (Team Monthly $12, Team Yearly $120, Business Monthly $24, Business Yearly $240) → copy their short URLs.

> **2. Webhook secret** — generate via `openssl rand -hex 24` (≥ 32 chars).

> **3. Gumroad Ping URL** — Settings → Advanced → Ping URL:
> ```
> https://<your-domain>/api/v1/webhooks/gumroad/<secret>
> ```
> Enable Resource Subscriptions: `sale`, `subscription_updated`, `subscription_ended`, `subscription_cancelled`, `subscription_restarted`, `refunded`, `dispute`.

> **4. Supabase** — run `supabase/migrations/20260420000001_gumroad_migration.sql` in the SQL editor (renames `ls_*` → `gr_*`).

> **5. Vercel env vars** — add:
> ```
> GUMROAD_WEBHOOK_SECRET=<secret from step 2>
> NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL=https://.../l/team-monthly
> NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL=https://.../l/team-yearly
> NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL=https://.../l/business-monthly
> NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL=https://.../l/business-yearly
> ```
> Remove: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_STORE_ID`, `NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_*`.

> **6. Merge** this PR. Vercel redeploys automatically.

> **7. Smoke test** — use Gumroad test-mode card `4242 4242 4242 4242`. Verify:
> ```sql
> SELECT id, plan, gr_subscription_id, gr_subscription_manage_url
> FROM workspaces WHERE plan != 'free';
> ```
> Then cancel via the customer's Manage Subscription page and confirm the workspace reverts to `plan = 'free'` within a minute.

---

## Rollback plan

If the webhook handler blows up after merge:

1. **Immediate:** remove `GUMROAD_WEBHOOK_SECRET` from Vercel. The handler will 503 every incoming ping and Gumroad will keep retrying until you fix it — nothing is destroyed.
2. **Revert:** `git revert` the PR merge commit on `main`. The DB migration is reversible — we renamed columns, didn't drop them with `CASCADE`, so reverting the code + reverting the migration (rename back) restores the Lemon Squeezy surface. But note: you'll also need to put the LS env vars back.
3. **Partial:** if only the paywall is causing issues, `git revert b60350d` will remove just the FeatureGate wrappers — billing plumbing stays intact.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Gumroad ping replay / duplicate delivery | `webhook_events` unique constraint + 23505 short-circuit (tested) |
| Ping arrives with bad `workspace_id` | Handler no-ops silently, returns 200 (tested) |
| Unknown future event type | Handler returns 200 OK with no mutation (tested) — stops retry storms |
| Pricing page and modal drift | Both read from `constants.ts` — single source of truth |
| Trial users never converting eat the DB | `handleTrialExpiryScan` nightly cron — tested handler, not a full E2E test |
| SSO section gated but doesn't exist yet | Variant is defined, will be wired when SSO ships; no dead code path |

---

## What I chose not to do in this PR

- **Proration math on plan changes** — we let Gumroad handle switches. Add custom proration only if customers complain.
- **Hard member-limit UI block on Free** — `canAddMember()` returns false when over, but the invite UI doesn't currently surface the upgrade modal. Low priority because paid tiers are unlimited members.
- **In-app receipt archive** — customers get emailed receipts from Gumroad. Billing page shows placeholder history.
- **Usage-based add-ons / metered billing** — everything stays flat per-seat.
- **Playwright E2E for the full checkout flow** — would require a live Supabase test project + Gumroad test mode harness. The 14 integration tests cover every webhook code path deterministically.

See `docs/references/billing-architecture.md` § 7 for the full non-goals list.
