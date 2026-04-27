# 🪞 Review — Pricing Page

> **Feature**: #02 — Pricing Page
> **Branch**: `feature/02-pricing-page`
> **Merged**: 2026-04 → `main`

## Result

**Status**: ✅ Shipped.

**Summary**: A standalone pricing page with 4-tier plan cards (Free, Team, Business, Enterprise), monthly/annual toggle showing 17% annual savings, a feature comparison matrix below the cards, and an FAQ section. Wired to Gumroad checkout permalinks via `lib/billing/plans.ts`.

## What Went Well ✅

- **Single source of truth from the start** — Plan rows, prices, and feature lists live in `lib/billing/plans.ts`; the page renders from that module. No copy drift between #02 and the in-app paywall (#22).
- **Monthly/annual toggle stored in URL** — `?cycle=annual` makes the annual view shareable for finance decision-makers.
- **Gumroad direct-permalink approach** — Zero SDK weight; checkout is a vanilla anchor href. Trade-offs documented in `docs/references/billing-architecture.md`.

## What Went Wrong ❌

- **Initial INR-only copy** — Visitors outside India saw INR with no conversion hint; mitigated by adding a small "≈ USD" annotation (still INR-billed; conversion happens at checkout).
- **Comparison table was wide** — Initial layout broke on tablet between 768-900px; resolved by stacking into per-plan accordions below 1024px.

## What Was Learned 📚

- Pricing is content + commerce; treating prices as data rather than copy avoided 3 places where amounts could have drifted.
- Annual savings should be expressed as both percentage and absolute amount — different audiences read different signals.

## What To Do Differently Next Time 🔄

- Build the comparison-matrix mobile collapse from day 1; retrofitting it cost a second pass.
- Start any pricing surface with a data-driven plan registry, never copy-pasted prices.

## Metrics

| Metric | Value |
|---|---|
| Plan tiers shipped | 4 |
| Source-of-truth files | 1 (`lib/billing/plans.ts`) |
| Followups merged later | INR↔USD hint, mobile accordion |

## Follow-ups

- [x] Source plan data from a single module (done)
- [ ] Add `data-plan` analytics attributes to every Upgrade button — backlog
- [ ] Localized currency display (INR/USD/EUR) — backlog
