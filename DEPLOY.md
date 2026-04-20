# Lazynext — Deployment Guide

Production deploy checklist for v1.0.0.1. Target platform: **Vercel** (can swap for Fly/Render — only `vercel.json` is Vercel-specific).

---

## 1. Prerequisites

- [ ] Supabase project created (https://supabase.com/dashboard)
- [ ] Groq API key (https://console.groq.com/keys)
- [ ] Together AI key (fallback) (https://api.together.xyz/settings/api-keys)
- [ ] Gumroad account with 6 recurring (subscription) products: starter/pro/business × monthly/yearly
- [ ] Resend API key + verified sending domain (https://resend.com/domains)
- [ ] Inngest account + event key + signing key (https://app.inngest.com)
- [ ] Domain pointed at Vercel (or platform of choice)

---

## 2. Database migration

From repo root, with Supabase CLI installed (`npm i -g supabase` or `brew install supabase/tap/supabase`):

```bash
# One-time link to your project
supabase link --project-ref <your-project-ref>

# Apply all migrations (includes 00002_decision_intelligence_spine.sql)
npm run db:migrate

# Generate typed client
SUPABASE_PROJECT_ID=<your-project-ref> npm run db:types
```

Verify in Supabase SQL editor:
```sql
select column_name from information_schema.columns
where table_name = 'decisions'
  and column_name in ('score_breakdown','is_public','public_slug','expected_by');
-- should return 4 rows

select column_name from information_schema.columns
where table_name = 'workspaces'
  and column_name in ('wms_score','power_user_override');
-- should return 2 rows
```

---

## 3. Environment variables

Set in **Vercel Project → Settings → Environment Variables** (Production + Preview):

| Variable | Source | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ (server-only, never expose) |
| `GROQ_API_KEY` | console.groq.com | ✅ (or scorer falls back to heuristic) |
| `TOGETHER_API_KEY` | api.together.xyz | ⚠️ recommended |
| `GUMROAD_WEBHOOK_SECRET` | Random long string you pick (used as URL path secret) | ✅ for billing |
| `NEXT_PUBLIC_GUMROAD_{STARTER,PRO,BUSINESS}_{MONTHLY,ANNUAL}_URL` | 6 Gumroad product permalinks | ✅ for billing |
| `RESEND_API_KEY` | resend.com | ✅ for email |
| `INNGEST_EVENT_KEY` | app.inngest.com | ✅ for background jobs |
| `INNGEST_SIGNING_KEY` | app.inngest.com | ✅ for background jobs |
| `NEXT_PUBLIC_APP_URL` | your production URL | ✅ (`https://lazynext.com`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | posthog.com | optional |
| `SENTRY_DSN` | sentry.io | optional |

> **Do not set placeholder values.** `lib/db/client.ts` and `lib/ai/lazymind.ts` pattern-match placeholders (`your-project`, `placeholder`, etc.) and short-circuit with fallbacks — but those fallbacks are meant for local dev, not production. Real keys only.

---

## 4. Webhooks

### Gumroad
- Dashboard → Advanced → **Ping** URL (applies to all products) **or** per-product Resource Subscription:
  `https://<your-domain>/api/v1/webhooks/gumroad/<GUMROAD_WEBHOOK_SECRET>`
- The secret path segment is how we verify authenticity — Gumroad does not sign pings. Use a long, random string.
- Resources to subscribe to: `sale`, `subscription_updated`, `subscription_ended`, `subscription_cancelled`, `subscription_restarted`, `refunded`, `dispute`.

### Inngest
- URL: `https://<your-domain>/api/inngest`
- Inngest dashboard → Apps → Sync → paste URL

### Supabase Auth callback
- Supabase → Authentication → URL Configuration
- Site URL: `https://<your-domain>`
- Redirect URLs: `https://<your-domain>/auth/callback`

---

## 5. Deploy

```bash
# Install Vercel CLI if needed
npm i -g vercel

# First deploy (links project)
vercel

# Production deploy
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard and push to `main`.

---

## 6. Post-deploy verification

- [ ] Visit `/` — landing page renders
- [ ] Visit `/sign-up` — auth works against real Supabase
- [ ] Create a workspace — onboarding completes
- [ ] Log a decision — `score_breakdown` populated (check row in Supabase)
- [ ] Mark a decision public — `/d/<slug>` renders with OG image
- [ ] Trigger `Cmd+Shift+D` — global shortcut opens log-decision modal
- [ ] Check Inngest dashboard — `handleDecisionLogged` ran on the new decision
- [ ] Observe logs: look for single-line JSON `decision_scorer` entries with `source:groq`

---

## 7. Log aggregation (required for alerting)

Pipe Vercel logs to your aggregator:

- **Axiom**: Vercel → Integrations → Axiom (one-click)
- **Datadog**: Vercel → Integrations → Datadog
- **Logtail/Better Stack**: Vercel → Integrations → Better Stack

### Alerts to create

| Alert | Query | Threshold |
|---|---|---|
| Scorer heuristic fallback spike | `decision_scorer AND source:heuristic AND fallback_cause:json_parse_failed` | > 5 / hour |
| Scorer AI outage | `decision_scorer AND fallback_cause:llm_call_failed` | > 10 / hour |
| Scorer latency | `decision_scorer AND duration_ms:>3000` | p95 > 3s |
| 5xx error rate | `level:error status:>=500` | > 1% of traffic |

---

## 8. Unskip E2E test in CI

`tests/e2e/public-decision.spec.ts` has one skipped test waiting on test-env Supabase credentials.

1. Create a **separate** Supabase project for CI (don't use prod).
2. Run migrations against it.
3. Seed one public decision with slug `test-decision`.
4. Add to GitHub repo → Settings → Secrets:
   - `TEST_SUPABASE_URL`
   - `TEST_SUPABASE_ANON_KEY`
5. Edit the `test.skip(...)` to `test(...)` and wire env vars into `.github/workflows/ci.yml`.

---

## 9. Rollback

```bash
# Vercel dashboard → Deployments → pick last-known-good → Promote to Production
# Or CLI:
vercel rollback <deployment-url>
```

Migrations are forward-only. If `00002_decision_intelligence_spine.sql` needs reverting, write `00003_revert_decision_intelligence.sql`.

---

## 10. Known post-v1 backlog

From [docs/project-roadmap.md](docs/project-roadmap.md):
- External REST API for third-party integrations
- AI workflow generation from prompt
- Decision DNA PDF/reporting export
- React Native mobile app
- Workspace templates gallery
- OAuth app marketplace
