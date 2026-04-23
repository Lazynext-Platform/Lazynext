# Billing Architecture

**Provider:** Gumroad · **Status:** Implemented on `feature/billing-gumroad-migration` · **Last updated:** 2026-04-20

This is the map of every moving piece in the billing system — what calls what, what lives where, and what you need to configure in Gumroad, Supabase, and Vercel to turn it on.

---

## 1. Plan model

### Slugs in the database (never change these)

| Slug | Display name | Monthly | Yearly | Who it's for |
|---|---|---|---|---|
| `free` | Free | — | — | Self-discovery, hobby use |
| `starter` | **Team** | $19/seat | $180/seat | Small squads that want unlimited nodes + Decision Health |
| `pro` | **Business** | $30/seat | $288/seat | Teams that want PULSE, Automation, and Outcome Tracking |
| `business` | **Enterprise** | Custom | Custom | Sales-led, no Gumroad product, no seat minimum |
| `enterprise` | *(reserved)* | — | — | Future use |

> **Why the slug/display mismatch?** Slugs were set before the pricing re-think. Renaming them would require a Postgres enum migration and rewriting every `plan = 'pro'` check in the codebase. The display layer (`pricing/page.tsx`, `UpgradeModal.tsx`) maps slug → human-friendly name — cheaper and reversible.

### Prices live in one place

[`lib/utils/constants.ts`](../../lib/utils/constants.ts) is the single source of truth:

```ts
export const PLAN_PRICING_USD         = { free: 0, starter: 19, pro: 30, business: null, enterprise: null }
export const PLAN_PRICING_USD_ANNUAL  = { free: 0, starter: 15, pro: 24, business: null, enterprise: null }
export const TRIAL_DAYS               = 30
export const FOUNDING_MEMBER_CAP      = 100
// Founding Members lock launch prices for life — no instant discount constant.
```

The pricing page and the upgrade modal both import from here. Change a number once, it updates everywhere.

### Feature gates

[`lib/utils/plan-gates.ts`](../../lib/utils/plan-gates.ts) encodes which features unlock at which plan:

| Feature | Free | Team (`starter`) | Business (`pro`) | Enterprise (`business`) |
|---|---|---|---|---|
| Unlimited nodes / members / workflows | ❌ | ✅ | ✅ | ✅ |
| AI queries per seat per day | 10 | 100 | 500 | unlimited |
| Decision Health Dashboard | ❌ | ✅ | ✅ | ✅ |
| Semantic search | ❌ | ❌ | ✅ | ✅ |
| Automation workflows | ❌ | ❌ | ✅ | ✅ |
| Weekly digest | ❌ | ❌ | ✅ | ✅ |
| PULSE | ❌ | ❌ | ✅ | ✅ |
| Custom fields / Audit log / SSO | ❌ | ❌ | ❌ | ✅ |

Helpers: `canAddMember()`, `canCreateWorkflow()`, `canCreateNode()`, `canUseAI()`, `hasFeature()`.

---

## 2. Runtime flow

### A. Customer clicks "Upgrade" in the app

```
Sidebar "Upgrade" button           (components/layout/Sidebar.tsx)
        │
        ▼
useUpgradeModal.getState().show()  (stores/upgrade-modal.store.ts)
        │
        ▼
<UpgradeModalHost />               (rendered once in workspace/[slug]/layout.tsx)
        │
        ▼
<UpgradeModal variant="…" />       (components/ui/UpgradeModal.tsx)
        │
        ▼ user clicks "Choose Business"
        │
POST /api/v1/billing/checkout
  body: { plan: 'pro', interval: 'yearly', workspaceId }
        │
        ▼
Handler                            (app/api/v1/billing/checkout/route.ts)
  1. auth check          → 401 if not signed in
  2. zod validate        → 400 if body bad
  3. workspace member    → 403 if not a member
  4. reads PLANS[plan][interval] → product URL from env var
  5. buildCheckoutUrl() appends ?workspace_id=…&user_id=…&plan=…&interval=…
        │
        ▼
Response: { url: "https://<seller>.gumroad.com/l/business-yearly?workspace_id=…" }
        │
        ▼
Modal does window.location.href = url
        │
        ▼
Customer completes payment on Gumroad
        │
        ▼
Gumroad POSTs a ping to /api/v1/webhooks/gumroad/<secret>
```

### B. Upgrade variants (why the modal shows contextual copy)

Every gated UI surface can trigger the modal with a variant string. Each variant renders a different explainer banner so the user knows *why* they're seeing the paywall.

| Variant | Triggered by | Banner copy |
|---|---|---|
| `node-limit` | Free workspace hits 100-node cap | "You've hit the Free plan node cap" |
| `ai-limit` | Daily AI quota exhausted | "You've used all of today's LazyMind AI queries" |
| `member-limit` | Tried to invite a 4th member on Free | "Free workspaces are capped at 3 members" |
| `health-gate` | Clicked Decision Health on Free/Team | "Decision Health Dashboard is a Business feature" |
| `automation-gate` | Clicked Automations on Free/Team | "Automation workflows is a Business feature" |
| `sso-gate` | SSO section in settings | "Single Sign-On is an Enterprise feature" |
| `full-upgrade` | Generic sidebar CTA | "Upgrade your plan" (no banner) |

Example wiring from anywhere in the app:

```ts
import { useUpgradeModal } from '@/stores/upgrade-modal.store'

function LockedFeatureButton() {
  return (
    <button onClick={() => useUpgradeModal.getState().show('health-gate')}>
      Open Decision Health
    </button>
  )
}
```

### C. Webhook processing

`app/api/v1/webhooks/gumroad/[secret]/route.ts` handles every Gumroad ping.

**Authentication:** URL-secret. The last path segment must equal `GUMROAD_WEBHOOK_SECRET`. Compared with `crypto.timingSafeEqual()` to prevent timing attacks. Gumroad pings are not HMAC-signed — URL-secret + HTTPS-only is their recommended pattern.

**Idempotency:** every ping is dedupe-keyed as `gumroad:<resource>:<sale_id or subscription_id>` and inserted into `webhook_events`. A `23505` (unique-violation) short-circuits with `{ received: true, duplicate: true }` — Gumroad retries are safe.

**Resource handling:**

| Gumroad `resource_name` | What we do |
|---|---|
| `sale` (or ping with `sale_id`) | Stamp `plan`, `gr_subscription_id`, `gr_customer_email`, `gr_subscription_manage_url` on the workspace identified by `url_params[workspace_id]` |
| `subscription_updated` | Refresh `gr_subscription_manage_url`; leave plan untouched (next `sale` will re-stamp) |
| `subscription_restarted` | Same as `subscription_updated` |
| `subscription_cancelled` / `subscription_ended` / `cancellation` | Downgrade to `free`, clear `gr_subscription_id` |
| `refunded` / `dispute` | Downgrade to `free` (treat as immediate termination) |
| anything else | 200 OK, no mutation (stops Gumroad retries on unknown events) |

**Coverage:** 14 integration tests in [`tests/integration/gumroad-webhook.test.ts`](../../tests/integration/gumroad-webhook.test.ts) exercise every path with a capturing Supabase mock.

### D. Customer manages their subscription

Gumroad doesn't expose a hosted customer portal like Stripe/Lemon Squeezy. Instead we derive the manage URL from the subscription id:

```
https://app.gumroad.com/subscriptions/<subscription_id>/manage
```

- Stamped on the workspace as `gr_subscription_manage_url` when the `sale` ping arrives
- `GET /api/v1/billing/portal` returns this URL (or derives it on the fly from `gr_subscription_id` as a fallback)
- The `BillingPage` "Manage Subscription" button uses this URL

### E. Trial auto-downgrade (background job)

[`lib/inngest/functions/index.ts → handleTrialExpiryScan`](../../lib/inngest/functions/index.ts)

- **Trigger:** cron `0 2 * * *` (02:00 UTC daily)
- **Query:** workspaces where `trial_ends_at < now` AND `plan != 'free'` AND `gr_subscription_id IS NULL`
- **Action:** update to `plan = 'free'`, clear `trial_ends_at`

This closes the loop: users who start a 30-day Business trial but never pay get auto-downgraded without any manual work.

### F. Founding Member counter (live banner)

- **API:** `GET /api/v1/billing/founding-member` → `{ cap, claimed, remaining, open }`
- **Counting rule:** `claimed` = count of workspaces where `gr_subscription_id IS NOT NULL`
- **Cache:** 5 minutes via `export const revalidate = 300`
- **Client:** `components/marketing/FoundingMemberBanner.tsx` — fetches on mount, renders `"{N} of 100 spots left"`, hides itself when `open: false`
- **Displayed on:** `/pricing` hero (replaces the old static banner)

---

## 3. Database schema

Added in migration [`supabase/migrations/20260420000001_gumroad_migration.sql`](../../supabase/migrations/20260420000001_gumroad_migration.sql). The migration renames the old Lemon Squeezy columns in place:

| Column | Type | Purpose |
|---|---|---|
| `workspaces.gr_customer_email` | `TEXT` | Buyer's email from the sale ping |
| `workspaces.gr_subscription_id` | `TEXT` | Gumroad subscription id (nullable; null = no paid sub) |
| `workspaces.gr_subscription_manage_url` | `TEXT` | Derived from subscription id; used by portal endpoint |
| `workspaces.trial_ends_at` | `TIMESTAMPTZ` | When trial expires; `handleTrialExpiryScan` reads this |
| `workspaces.plan` | `TEXT` | One of the 5 slugs listed above |
| `webhook_events.event_id` | `TEXT UNIQUE` | Dedupe key: `gumroad:<resource>:<id>` |
| `webhook_events.event_name` | `TEXT` | The `resource_name` the ping claimed |
| `webhook_events.processed_at` | `TIMESTAMPTZ` | Insert timestamp |

---

## 4. Environment variables

### Server-only

```bash
GUMROAD_WEBHOOK_SECRET=<40-char random string>   # Required — or webhook returns 503
```

### Product URLs (server or public — public preferred so they're also embedded in the marketing site)

```bash
NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL=https://<seller>.gumroad.com/l/team-monthly
NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL=https://<seller>.gumroad.com/l/team-yearly
NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL=https://<seller>.gumroad.com/l/business-monthly
NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL=https://<seller>.gumroad.com/l/business-yearly
# NEXT_PUBLIC_GUMROAD_BUSINESS_*_URL intentionally NOT set — Enterprise is sales-led
```

The checkout handler falls back from `NEXT_PUBLIC_*` to non-public vars if you prefer to keep them server-only.

### Drop these (no longer used)

```bash
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID
NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_*
```

---

## 5. Gumroad setup checklist (external)

1. **Create account** at [gumroad.com](https://gumroad.com). Verify seller identity.
2. **Create 4 subscription products:**
   - Lazynext — Team (Monthly) at $19/mo
   - Lazynext — Team (Yearly) at $180/yr (= $15/seat/mo, 21% save)
   - Lazynext — Business (Monthly) at $30/mo
   - Lazynext — Business (Yearly) at $288/yr (= $24/seat/mo, 20% save)
3. **Copy each product's short URL** (e.g., `https://youraccount.gumroad.com/l/team-monthly`).
4. **Generate a webhook secret** (≥ 32 random chars, e.g., `openssl rand -hex 24`).
5. **Settings → Advanced → Ping URL:**
   ```
   https://<your-domain>/api/v1/webhooks/gumroad/<secret>
   ```
6. **Settings → Advanced → Resource Subscriptions** — enable: `sale`, `subscription_updated`, `subscription_ended`, `subscription_cancelled`, `subscription_restarted`, `refunded`, `dispute`.
7. **Supabase:** run `supabase/migrations/20260420000001_gumroad_migration.sql` in the SQL editor.
8. **Vercel:** add the env vars listed in §4, remove Lemon Squeezy ones, redeploy.
9. **Test purchase** with Gumroad test mode card `4242 4242 4242 4242`. Verify in Supabase:
   ```sql
   SELECT id, plan, gr_subscription_id, gr_subscription_manage_url
   FROM workspaces
   WHERE plan != 'free';
   ```
10. **Test cancel** via the customer's Manage Subscription page. Verify the workspace reverts to `plan = 'free'` within a minute.

---

## 6. File map

```
app/api/v1/
  billing/
    checkout/route.ts          ← POST: creates Gumroad checkout URL
    portal/route.ts            ← GET:  returns manage URL
    founding-member/route.ts   ← GET:  remaining spots (5-min cached)
  webhooks/
    gumroad/[secret]/route.ts  ← POST: all Gumroad pings

components/
  ui/
    UpgradeModal.tsx           ← the modal (7 variants)
    UpgradeModalHost.tsx       ← global mount point
  marketing/
    FoundingMemberBanner.tsx   ← live counter on /pricing

stores/
  upgrade-modal.store.ts       ← global show()/close() trigger

lib/
  billing/
    plans.ts                   ← PLANS config + buildCheckoutUrl()
  utils/
    constants.ts               ← prices, trial days, founding cap
    plan-gates.ts              ← canUseAI, hasFeature, etc.
  inngest/
    functions/index.ts         ← handleTrialExpiryScan

supabase/migrations/
  20260420000001_gumroad_migration.sql

tests/
  integration/gumroad-webhook.test.ts   ← 14 tests, all event paths
  unit/billing-plans.test.ts            ← PLANS + buildCheckoutUrl
  unit/plan-gates.test.ts               ← gating rules
```

---

## 7. What the modal does NOT do yet

These are deliberate non-goals for v1 — add them when there's real demand:

- **Proration math on plan changes.** We just let Gumroad handle it — if a user is on Team and clicks "Choose Business", they pay Business from day one and Gumroad prorates the switch. We don't compute credit ourselves.
- **In-app seat counter that hard-blocks invites.** `canAddMember()` returns `false` for over-limit, but no UI currently calls `useUpgradeModal.show('member-limit')` from the invite flow. Low priority because paid tiers are all unlimited-members — only Free hits this.
- **Receipt archive in-app.** Customers get emailed receipts from Gumroad; we don't store them. The billing page shows placeholder history.
- **Usage-based add-ons.** No metered billing. Everything is flat per-seat.

---

## 8. Further reading

- Tests: [tests/integration/gumroad-webhook.test.ts](../../tests/integration/gumroad-webhook.test.ts)
- Schema: [lib/db/schema.ts](../../lib/db/schema.ts)
- Plan helpers: [lib/utils/plan-gates.ts](../../lib/utils/plan-gates.ts)
- Pricing page: [app/(marketing)/pricing/page.tsx](../../app/(marketing)/pricing/page.tsx)
- AGENTS.md billing section: see the "Key Rules" → feature branches discipline
