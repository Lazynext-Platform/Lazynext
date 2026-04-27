# 📋 Summary — Billing & Subscription

> **Feature**: #13 — Billing & Subscription
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The billing management page nested under Settings, showing the workspace's current plan, an inline 4-tier comparison grid (Free / Team / Business / Enterprise), payment method, invoice history, and live usage metrics (nodes, AI queries, storage) plotted against plan limits. Checkout is delegated to **Gumroad** permalinks per plan + cycle (monthly / annual); subscription state syncs in via Gumroad's ping webhook.

## Key Decisions

- **Gumroad over Stripe for v1.0** — Direct checkout permalinks, zero SDK weight, Gumroad handles tax/compliance globally. Trade-off: less control over the checkout UX, but unblocks an India-first launch without a merchant of record.
- **Per-seat pricing in USD** — `PLAN_PRICING_USD` / `PLAN_PRICING_USD_ANNUAL` in `lib/utils/constants.ts` are the source of truth; the pricing page and in-app paywall both render via `formatPrice` from `lib/i18n` for locale-aware display. Gumroad handles checkout currency conversion.
- **Usage shown against limits, not just absolute numbers** — A "78% of 500 nodes" bar drives upgrade intent better than a raw count.
- **Webhook-secret-via-URL-path** — Gumroad pings POST to `/api/inngest/gumroad/{secret}`. Avoids needing to verify a header signature Gumroad doesn't provide; the path itself is the secret.
- **Plan limits live in `lib/wms.ts`** — Single source of truth read by every feature that gates on plan (LazyMind, Health Dashboard, Audit Log, etc.).

## Files & Components Affected

- `app/(app)/workspace/[slug]/billing/page.tsx` — Billing page
- `components/billing/PlanCard.tsx`, `UsageMeters.tsx`, `InvoiceTable.tsx`
- `lib/billing/gumroad.ts` — Permalink resolver + webhook signature/secret check
- `lib/wms.ts` — Plan-limit registry (`PLAN_LIMITS`)
- `app/api/inngest/gumroad/[secret]/route.ts` — Webhook ingestion → Inngest event
- `lib/inngest/functions/gumroad-sync.ts` — Async plan/seat update
- `lib/db/schema/subscriptions.ts`

## Dependencies

- **Depends on**: #12 Workspace Settings (entry point), #03 Auth Pages
- **Enables**: Plan-gated features — #08, #10, #17, #18, #21, #38, and #22 paywall

## Notes

- Legacy env-var naming retained: `STARTER` = Team plan, `PRO` = Business plan (4 URLs total: `{STARTER,PRO} × {MONTHLY,ANNUAL}`).
- Invoice download is a Gumroad-hosted link — Lazynext does not generate PDFs.
- See `docs/references/billing-architecture.md` for the full webhook + state-sync flow.
