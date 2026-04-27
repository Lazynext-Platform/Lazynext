# 📋 Summary — Upgrade & Paywall Modal

> **Feature**: #22 — Upgrade & Paywall Modal
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A family of contextual upgrade surfaces that appear at the exact moment a user hits a plan limit. **Decision Search Paywall** (blurred results + inline upgrade card). **Node Limit warning** (50/50 cap on Free). **AI Query Limit** (LazyMind daily cap with countdown to midnight IST reset). **Health Dashboard Gate** (blurred preview + Business-plan overlay). **Full Upgrade Modal** (3-plan comparison with monthly/annual toggle, "Save 17%" annual savings, "Most Popular" badge). **Trial Banners** in 3 states (Active / Expiring Soon / Expired) shown as persistent top bars.

## Key Decisions

- **Show what they're missing** — Every paywall blurs the content behind it rather than hiding it. Users see the value before being asked to pay.
- **Contextual, not generic** — Six variants, not one modal. Each appears when the limit is actually hit, with copy tailored to the feature.
- **Annual toggle defaults to monthly** — Annual savings ("Save 17%") are visible but not coercive; users opt in.
- **Trial Banners persist** — Top-bar banner across the entire app on trial; impossible to forget the trial state.
- **All paywalls route through `UpgradeModalStore`** — `stores/upgrade-modal.store.ts` exposes `open(variant)` so any feature can trigger the right paywall in one line.

## Files & Components Affected

- `components/canvas/UpgradePaywall.tsx` — Variants registry
- `components/canvas/UpgradeModal.tsx` — Full plan-comparison modal
- `components/layout/TrialBanner.tsx` — Top-bar banner
- `stores/upgrade-modal.store.ts` — Cross-feature trigger
- `lib/wms.ts` — Plan limits checked by gating code

## Dependencies

- **Depends on**: #13 Billing & Subscription (plan state, checkout permalinks)
- **Enables**: Conversion path for every paid feature (#08, #10, #17, #18, #21, #38)

## Notes

- All prices are sourced from `lib/utils/constants.ts` (`PLAN_PRICING_USD` / `PLAN_PRICING_USD_ANNUAL`) and locale-formatted via `formatPrice` from `lib/i18n` — same source of truth as the marketing pricing page (#02), so there's no copy drift between the public page and the in-app paywall.
- The "Maybe later" dismissal sets a 24h cookie that suppresses the same variant; hard limits (e.g., node 50/50) are not dismissible.
