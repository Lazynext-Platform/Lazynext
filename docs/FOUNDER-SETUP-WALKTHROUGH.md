# Founder Setup Walkthrough (Non-Technical)

> **Who this is for:** You, the founder. You shipped Lazynext to production but still need to wire up billing, emails, background jobs, and monitoring. This guide walks you through every remaining manual step with exact clicks.
>
> **Time:** ~90 minutes end-to-end, split across 6 phases. You can stop after any phase and come back.
>
> **Current state:** Site is live at https://lazynext.com. Code is shipped. What's left is plugging in third-party services (Gumroad, Resend, Inngest, etc.) so users can actually pay, get emails, and so you get alerted when something breaks.

---

## How to use this guide

- Each phase has a **Goal**, a **Why**, numbered **Steps**, and a **Verify** box at the end.
- When you see `👉 Copy this:` — copy exactly what's in the code block.
- When you see `💾 Save for later:` — paste that value into a notes file. You'll need it in Phase 4.
- When you see `⚠️` — that's a trap. Read carefully.
- Tick boxes `[ ]` as you go so you don't lose your place.

---

# Phase 0 — Quick audit (5 min)

**Goal:** Figure out what's already done vs. what's left, so you don't re-do anything.

**Why:** You've already deployed once, so some of this may be live. Let's check before burning time.

## Steps

**1.** Open Vercel dashboard: https://vercel.com/dashboard → click your Lazynext project → **Settings** → **Environment Variables**.

**2.** Look at the list. For each of these, tick the box if it's **already set** (has a value):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GROQ_API_KEY`
- [ ] `TOGETHER_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `INNGEST_EVENT_KEY`
- [ ] `INNGEST_SIGNING_KEY`
- [ ] `GUMROAD_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL`
- [ ] `NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL`
- [ ] `NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL`
- [ ] `NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL`
- [ ] `NEXT_PUBLIC_APP_URL` (should be `https://lazynext.com`)

**3.** Any box you didn't tick → that's work for later phases. Keep this list open.

## Verify

You now know what's missing. If everything is ticked, skip to Phase 6 (monitoring). If billing vars are missing, start at Phase 1.

---

# Phase 1 — Gumroad (billing setup) — 25 min

**Goal:** Create 4 paid subscription products so customers can actually give you money.

**Why:** No Gumroad products = the Upgrade button in the app does nothing = zero revenue.

## 1A. Create your Gumroad account (skip if done)

**1.** Go to https://gumroad.com/signup

**2.** Sign up with the same email you use for the business.

**3.** Finish their onboarding (bank info, tax form). Gumroad pays you out automatically once you have sales.

## 1B. Create 4 subscription products

You're creating **4** products, one for each plan × billing cycle:

| # | Plan | Billing | Price |
|---|------|---------|-------|
| 1 | Team | Monthly | $19 |
| 2 | Team | Yearly | $180 (per seat, per year — works out to $15/seat/month, a 21% save) |
| 3 | Business | Monthly | $30 |
| 4 | Business | Yearly | $288 (per seat, per year — works out to $24/seat/month, a 20% save) |

For **each** of the 4 products:

**1.** Gumroad dashboard → top-right **+ New product**.

**2.** Choose product type: **"Membership"** (this is Gumroad's name for subscription).

**3.** Fill in:
   - **Name:** e.g. `Lazynext Team (Monthly)` for product #1
   - **Price:** enter the price from the table above (e.g. `19` for Team Monthly)
   - **Recurrence:** Monthly or Yearly (match the table)
   - **Description:** one sentence, e.g. `Lazynext Team plan — unlimited members, nodes, workflows. Decision Health Dashboard included. 100 AI queries/seat/day. Billed monthly.`
   - **Thumbnail:** upload your Lazynext logo (square, at least 600x600).

**4.** Click **Save and continue**.

**5.** On the product page, find the URL at the top — it looks like `https://YOURNAME.gumroad.com/l/team-monthly` or similar.

**💾 Save for later:** copy this URL. Label it `STARTER_MONTHLY_URL` (Team is called "starter" in the code).

**6.** Repeat steps 1–5 for the other 3 products. Save each URL with the label shown:

| Product | Save URL as |
|---|---|
| Team Monthly ($19) | `STARTER_MONTHLY_URL` |
| Team Yearly ($180) | `STARTER_ANNUAL_URL` |
| Business Monthly ($30) | `PRO_MONTHLY_URL` |
| Business Yearly ($288) | `PRO_ANNUAL_URL` |

⚠️ The code uses the old names **"starter"** and **"pro"** for Team and Business. Don't change this — just match the labels above.

## 1C. Generate webhook secret

**1.** Open Terminal on your Mac.

**2.** Paste and run:
   ```bash
   openssl rand -hex 24
   ```

**3.** You'll get a 48-character random string like `a7f3b2c1...`.

**💾 Save for later:** paste it in your notes as `GUMROAD_WEBHOOK_SECRET`.

## 1D. Set the webhook URL in Gumroad

**1.** Gumroad dashboard → **Settings** (left sidebar) → **Advanced** tab.

**2.** Scroll to **Ping** section.

**3.** In the URL field, paste:
   ```
   https://lazynext.com/api/v1/webhooks/gumroad/YOUR_SECRET_HERE
   ```
   Replace `YOUR_SECRET_HERE` with the 48-char string you generated in 1C.

**4.** Below the URL field, tick ALL of these Resource Subscription boxes:
   - [ ] `sale`
   - [ ] `subscription_updated`
   - [ ] `subscription_ended`
   - [ ] `subscription_cancelled`
   - [ ] `subscription_restarted`
   - [ ] `refunded`
   - [ ] `dispute`

**5.** Click **Update Settings** at the bottom.

## Verify Phase 1

- [ ] 4 products exist in Gumroad dashboard
- [ ] You have 4 URLs saved in your notes
- [ ] You have `GUMROAD_WEBHOOK_SECRET` saved in your notes
- [ ] Ping URL is set in Gumroad Advanced settings

---

# Phase 2 — Email, AI, Jobs (API keys) — 20 min

**Goal:** Get API keys from Resend (email), Groq (AI), Together (AI fallback), Inngest (background jobs).

**Why:** Without these keys, users get no emails, AI features break, and scheduled jobs (like the trial-expiry cron) don't run.

## 2A. Resend — transactional email

**1.** Go to https://resend.com/signup → sign up with your business email.

**2.** After login → **Domains** tab (left sidebar) → **+ Add Domain**.

**3.** Enter `lazynext.com` → click **Add**.

**4.** Resend shows you 3–4 DNS records (TXT, MX, DKIM). You need to add these to your domain registrar.

**5.** Where is your domain registered? (GoDaddy, Namecheap, Cloudflare, etc.) Log in there.

**6.** In your registrar's DNS management, add each record Resend showed you:
   - Type: TXT / MX / DKIM (match what Resend says)
   - Name/Host: copy from Resend
   - Value: copy from Resend
   - TTL: leave default (usually 3600 or Auto)

**7.** Back in Resend → click **Verify DNS**. Wait 5 minutes. Click again if needed (DNS can take up to 48 hours, but usually works in 5 min).

**8.** Once verified → **API Keys** tab → **+ Create API Key**.

**9.** Name: `Lazynext Production`. Permission: **Full access**. Click **Add**.

**10.** Copy the key (starts with `re_`).

**💾 Save for later:** paste as `RESEND_API_KEY`.

## 2B. Groq — primary AI

**1.** Go to https://console.groq.com/keys → sign up (Google sign-in is fastest).

**2.** Click **Create API Key**. Name: `Lazynext Production`.

**3.** Copy the key (starts with `gsk_`).

**💾 Save for later:** paste as `GROQ_API_KEY`.

⚠️ Groq's free tier has rate limits. If you start getting paying customers, upgrade to paid — but free is fine to launch.

## 2C. Together AI — fallback AI (optional but recommended)

**1.** Go to https://api.together.xyz/settings/api-keys → sign up.

**2.** Click **Create Key**. Copy it.

**💾 Save for later:** paste as `TOGETHER_API_KEY`.

## 2D. Inngest — background jobs

**1.** Go to https://app.inngest.com → sign up.

**2.** Create a new app. Name: `Lazynext`.

**3.** In the app → **Manage** → **Keys** tab.

**4.** You'll see two keys:
   - **Event Key** (starts with something random)
   - **Signing Key** (starts with `signkey-`)

**💾 Save for later:** paste both as `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.

⚠️ Don't sync the app URL yet — we do that in Phase 5, after env vars are set.

## Verify Phase 2

- [ ] Resend domain `lazynext.com` shows "Verified" in green
- [ ] You have `RESEND_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` saved in notes

---

# Phase 3 — Supabase finishing touches — 10 min

**Goal:** Make sure auth redirects work and the database has the latest migrations.

**Why:** If the auth redirect is wrong, users can sign up but can't log in. If migrations aren't applied, features break.

## 3A. Auth URL configuration

**1.** Supabase dashboard → your Lazynext project → **Authentication** (left sidebar) → **URL Configuration**.

**2.** **Site URL:** change to `https://lazynext.com` (no trailing slash).

**3.** **Redirect URLs:** click **Add URL** and paste:
   ```
   https://lazynext.com/auth/callback
   https://www.lazynext.com/auth/callback
   ```
   (Both, since lazynext.com redirects to www.lazynext.com.)

**4.** Click **Save**.

## 3B. Apply database migrations

**1.** Open Terminal → navigate to your project:
   ```bash
   cd ~/Desktop/Lazynext
   ```

**2.** If Supabase CLI isn't installed:
   ```bash
   brew install supabase/tap/supabase
   ```
   (Takes ~2 min.)

**3.** Log in:
   ```bash
   supabase login
   ```
   Browser opens → approve.

**4.** Get your **Project Ref** from Supabase dashboard → Settings → General → Reference ID (looks like `abcdefghijklmnop`).

**5.** Link:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

**6.** Apply migrations:
   ```bash
   npm run db:migrate
   ```

**7.** Verify — Supabase dashboard → **SQL Editor** → paste:
   ```sql
   select column_name from information_schema.columns
   where table_name = 'decisions'
   and column_name in ('score_breakdown','is_public','public_slug','expected_by');
   ```
   Click **Run**. You should see **4 rows**. If you see 0 or fewer, migration didn't apply — ping me.

## Verify Phase 3

- [ ] Site URL and redirect URLs saved in Supabase
- [ ] `npm run db:migrate` ran without errors
- [ ] SQL query returned 4 rows

---

# Phase 4 — Paste env vars into Vercel — 10 min

**Goal:** Tell your production deployment about all the keys from Phases 1–2.

**Why:** Until these are set, the code has nothing to authenticate with. Every billing / email / AI call fails.

## Steps

**1.** Vercel dashboard → your Lazynext project → **Settings** → **Environment Variables**.

**2.** For each variable below, click **Add New**, paste the key + value from your notes, select **Production**, **Preview**, **Development** (all three), click **Save**.

| Variable name | Value (from your notes) |
|---|---|
| `GUMROAD_WEBHOOK_SECRET` | 48-char hex from Phase 1C |
| `NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL` | Team Monthly URL |
| `NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL` | Team Yearly URL |
| `NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL` | Business Monthly URL |
| `NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL` | Business Yearly URL |
| `RESEND_API_KEY` | Resend key |
| `GROQ_API_KEY` | Groq key |
| `TOGETHER_API_KEY` | Together key |
| `INNGEST_EVENT_KEY` | Inngest event key |
| `INNGEST_SIGNING_KEY` | Inngest signing key |
| `NEXT_PUBLIC_APP_URL` | `https://lazynext.com` |

⚠️ Variables starting with `NEXT_PUBLIC_` are exposed to the browser. Others are server-only. Paste exactly as listed.

**3.** After adding them all, trigger a redeploy:
   - **Deployments** tab → top row → **⋯** (three dots) → **Redeploy**.
   - Confirm without "Use existing Build Cache" ticked.
   - Wait ~3 min.

## Verify Phase 4

- [ ] All 11 variables added in Vercel
- [ ] Latest deployment is green (✓) in the Deployments tab
- [ ] Visit https://lazynext.com/pricing — page loads, shows "X of 100 spots left" banner

---

# Phase 5 — Inngest sync — 5 min

**Goal:** Tell Inngest where your app lives so cron jobs fire.

**Why:** The 14-day trial expiry cron (that downgrades unpaid trials) needs Inngest to know the URL.

## Steps

**1.** Inngest dashboard → your `Lazynext` app → **Apps** tab → **Sync App**.

**2.** Paste this URL:
   ```
   https://lazynext.com/api/inngest
   ```

**3.** Click **Sync**.

**4.** You should see **"4 functions synced"** (or similar). If it says 0, env vars aren't live yet — wait for the Vercel redeploy to finish.

## Verify Phase 5

- [ ] Inngest shows your functions (look for `handleDecisionLogged`, `handleTrialExpiryScan`, `handleBillingWelcome`)
- [ ] No red error banner

---

# Phase 6 — Monitoring + alerts — 15 min

**Goal:** Get notified when production breaks instead of finding out from angry users.

**Why:** Silent production failures are the #1 way to lose early customers.

## 6A. Pick a log aggregator

Easiest option: **Better Stack** (free tier: 1 GB/mo, plenty for launch).

**1.** Go to https://betterstack.com/logs → sign up.

**2.** Create a new source → **Vercel**.

**3.** Better Stack shows instructions: "Go to Vercel → Integrations → Better Stack → Install."

**4.** Follow their one-click flow. Takes ~2 min.

## 6B. Create 4 alerts

Still in Better Stack → **Alerts** → **+ New Alert**. Create these 4:

| Alert name | Log query | Threshold | Severity |
|---|---|---|---|
| Scorer fell back to heuristic | `decision_scorer AND fallback_cause:json_parse_failed` | > 5 per hour | warning |
| Scorer AI fully down | `decision_scorer AND fallback_cause:llm_call_failed` | > 10 per hour | critical |
| Scorer too slow | `decision_scorer AND duration_ms:>3000` | p95 > 3s | warning |
| 5xx error rate | `level:error status:>=500` | > 1% of traffic | critical |

Notifications: enter your email. Optionally connect Slack/SMS.

## Verify Phase 6

- [ ] Better Stack is receiving logs from Vercel (visible in Live Tail)
- [ ] 4 alerts saved and active

---

# Phase 7 — Smoke test with real money — 10 min

**Goal:** Prove the full billing loop works end-to-end.

**Why:** Better to find a broken flow on a test card than when your first paying customer churns.

## Steps

**1.** Gumroad dashboard → **Settings** → **Payments** tab → tick **Test Mode**.

**2.** Go to https://lazynext.com/pricing → click **Upgrade to Team** or similar.

**3.** On Gumroad checkout, use the test card:
   - Number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/30`)
   - CVV: `123`
   - ZIP: `12345`

**4.** Complete the purchase.

**5.** Within 30 seconds:
   - The workspace should show "Team" plan in Settings → Billing
   - You should get a welcome email from Resend
   - Supabase SQL editor → run:
     ```sql
     SELECT id, plan, gr_subscription_id, gr_subscription_manage_url
     FROM workspaces WHERE plan != 'free';
     ```
     → should show 1 row with `plan='starter'` (= Team) and a real subscription ID.

**6.** Cancel: click **Manage subscription** in Settings → Billing → Cancel on the Gumroad page.

**7.** Within 1 minute, the workspace should revert to `plan = 'free'`.

**8.** Back in Gumroad → **Settings** → **Payments** → untick Test Mode. You are live for real customers.

## Verify Phase 7

- [ ] Test purchase upgraded workspace to Team
- [ ] Welcome email arrived
- [ ] Cancel reverted workspace to Free
- [ ] Test Mode is OFF in Gumroad

---

# Phase 8 (optional, defer if tired) — CI test infrastructure — 20 min

**Goal:** Unskip the 2 E2E tests that check the public-decision page.

**Why:** Catches regressions on the public sharing feature. Safe to skip for launch, but do this before v2.

## Steps

**1.** Supabase dashboard → create a **second project** (free tier is fine). Name: `Lazynext CI`. Don't use prod.

**2.** On this new project: **SQL Editor** → paste + run every SQL file from `lib/db/migrations/` in order.

**3.** Settings → API → copy:
   - `Project URL`
   - `anon public` key

**4.** Still in SQL Editor, seed one test decision:
   ```sql
   -- Create a test workspace and decision (run this after migrations)
   INSERT INTO workspaces (id, name, slug, plan)
   VALUES ('00000000-0000-0000-0000-000000000001', 'CI Workspace', 'ci-workspace', 'free');

   INSERT INTO decisions (id, workspace_id, title, is_public, public_slug, score_breakdown)
   VALUES (
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'Test Public Decision',
     true,
     'test-decision',
     '{"total": 85}'::jsonb
   );
   ```

**5.** GitHub → your Lazynext repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:
   - Name: `TEST_SUPABASE_URL`, Value: the URL from step 3
   - Name: `TEST_SUPABASE_ANON_KEY`, Value: the anon key from step 3

**6.** Edit `tests/e2e/public-decision.spec.ts` → find the two `test.skip(!hasSupabaseCreds, ...)` lines → the CI env vars are now set, so skip auto-resolves. Commit:
   ```bash
   git commit -am "test(e2e): enable public-decision tests in CI"
   git push origin main
   ```

## Verify Phase 8

- [ ] GitHub Actions → latest run → all tests green, **no skips**

---

# You're done

If all phases are green, Lazynext is fully production-ready with:
- Working payments
- Working emails
- Working background jobs
- Monitoring + alerts
- CI test coverage

Total time invested: ~90 min split across 8 phases.

## What to do next

1. **Soft launch** to your close network (Twitter, friends, existing users). Watch Better Stack for any red flags.
2. **Hard launch** on Product Hunt / Hacker News once you've fixed any soft-launch bugs.
3. **Founding Member campaign** — first 100 paying workspaces get 30% off for life. This is wired into the pricing page already.

## If something breaks

- **Email didn't arrive:** Resend dashboard → **Emails** → look for failures.
- **Upgrade button does nothing:** Browser DevTools → Network tab → click upgrade → look for red 4xx/5xx responses.
- **Workspace didn't upgrade after purchase:** Gumroad → **Settings** → **Advanced** → **Ping history** → look for red ✗ next to recent pings. The error column tells you what went wrong.
- **Anything else:** check Better Stack logs. Filter by `level:error`. The stack trace usually points at the file.

## Handy references

- DEPLOY.md — the engineer-flavored version of this guide
- docs/references/billing-architecture.md — what the billing code does under the hood
- docs/project-roadmap.md — the full 38-feature map

---

*Last updated: 2026-04-20*
