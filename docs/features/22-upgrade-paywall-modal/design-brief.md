# Design Brief — Upgrade & Paywall Modals

> Feature: 22 — Upgrade & Paywall Modals
> Date: 2026-04-05
> Target Fidelity: Mockup

## Overview

**What:** Six upgrade/paywall UI variants that gate premium features and guide free/trial users toward paid plans: Decision Search Paywall (blurred results with inline upgrade card), Node Limit warning (50-node cap), AI Query Limit (LazyMind daily limit), Health Dashboard Gate (blurred preview with overlay), Full Upgrade Modal (3-plan comparison with annual toggle), and Trial Banners (active/expiring/expired states).

**Why:** Monetization surfaces must be carefully designed to communicate value rather than block users. Each paywall is contextual — it appears at the exact moment a user experiences a limit — and clearly shows what they gain by upgrading. The goal is conversion through demonstrated value, not frustration.

**Where:** Paywalls appear inline within their respective features (search results, canvas, AI panel, health dashboard). The Full Upgrade Modal is a global overlay accessible from any paywall CTA or navigation. Trial Banners appear as persistent top bars across the app.

## Target Users

- Free plan users hitting usage limits (50 nodes, 10 decisions searchable, 10 AI queries/day)
- Trial users nearing or past their 14-day trial period
- Starter/Pro users encountering Business-only features (Health Dashboard)
- Any user evaluating plan options via the Full Upgrade Modal

## Requirements

**Must Have**
- [x] Decision Search Paywall: search bar with query visible, 3 blurred result rows, gradient fade, inline upgrade card with feature list (unlimited nodes, full Decision DNA search, 100 LazyMind queries, imports), "Upgrade to Starter" CTA with INR pricing (499/seat/mo), 14-day trial mention
- [x] Node Limit: amber warning icon, "50 of 50" usage text, full progress bar (100%), upgrade pitch with unlimited nodes highlight, "Upgrade to Starter" CTA, "Maybe later" dismissal
- [x] AI Query Limit: sparkle icon, "10/10 queries used today" counter, full progress bar, midnight IST reset note, tier comparison table (Free=10, Starter=100, Pro=500, Business=Unlimited), "Upgrade for More Queries" CTA
- [x] Health Dashboard Gate: blurred dashboard preview (4-col stat cards + 2-col charts), centered overlay card with chart icon, feature description, "Business Plan" badge, "Upgrade to Business" CTA (2,999/seat/mo), "or start with Pro" fallback
- [x] Full Upgrade Modal: close button, Monthly/Annual toggle with "Save 17%" badge, 3-plan grid (Starter/Pro/Business) with annual pricing (415/832/2,499), feature lists per plan, "Most Popular" badge on Starter, "Start Free Trial" / "Contact Sales" CTAs, footer with trial/no-CC/cancel-anytime notes
- [x] Trial Banners — 3 states: Active (11 days remaining, blue tint, progress bar at 21%, "Upgrade Now"), Expiring Soon (2 days, amber tint, warning icon, feature loss reminder), Expired (red tint, "now on Free plan", "Upgrade" CTA)

**Nice to Have**
- [x] Blurred content behind paywalls to show what users are missing
- [x] Tier comparison table in AI Query Limit showing progressive value
- [x] "Most Popular" badge on Starter plan in Full Upgrade Modal
- [x] Annual pricing with "Save 17%" badge

**Out of Scope**
- Payment processing UI (handled by Feature 13 — Billing)
- Plan downgrade confirmation flows
- Enterprise/custom pricing pages
- Usage analytics dashboard for plan monitoring

## Layout

- **Page type:** Mixed — inline panels, overlays, and banner bars
- **Primary layout:** Varies per variant
- **Key sections:**
  1. Decision Search Paywall: Full-width panel (max-w-lg) with search bar at top, blurred rows, gradient fade, and centered upgrade card (max-w-sm, bg-slate-800 border-[#4F6EF7]/30)
  2. Node Limit: Centered card (max-w-md) with amber border accent, icon, progress bar, CTA + dismiss
  3. AI Query Limit: Compact card (max-w-sm) with usage counter, progress bar, tier table, CTA
  4. Health Dashboard Gate: Full panel (max-w-lg) with blurred grid background + centered overlay card (max-w-xs, bg-slate-800 border-purple-500/30)
  5. Full Upgrade Modal: Centered overlay (max-w-xl) with header/close, toggle, 3-column plan grid, footer
  6. Trial Banners: Full-width horizontal bars (max-w-xl centered) with icon + text left, progress/CTA right

## States & Interactions

| State | Description |
|-------|-------------|
| Decision Search Paywall | Blurred results with inline upgrade card showing Starter features |
| Node Limit | Warning card with full progress bar and Starter CTA |
| Node Limit dismissed | Card hidden after "Maybe later" click |
| AI Query Limit | Usage counter at max, tier table visible |
| AI Query Limit — reset | Counter resets at midnight IST, card disappears |
| Health Dashboard Gate | Blurred dashboard with Business plan overlay |
| Full Upgrade Modal — monthly | Shows monthly prices (499/999/2,999) |
| Full Upgrade Modal — annual | Shows annual prices (415/832/2,499) with "Save 17%" badge |
| Full Upgrade Modal — closed | Modal dismissed via close button or backdrop |
| Trial Banner — active | Blue tint, days remaining, progress bar |
| Trial Banner — expiring | Amber tint, 2 days remaining, feature loss warning |
| Trial Banner — expired | Red tint, downgrade notice |

**Key interactions:**
- Upgrade CTAs navigate to checkout/billing flow (Feature 13)
- "Maybe later" dismisses the Node Limit card (session-scoped)
- Monthly/Annual toggle recalculates prices and shows/hides "Save 17%" badge
- Close button and backdrop dismiss the Full Upgrade Modal
- Trial Banner "Upgrade Now" / "Upgrade" buttons open the Full Upgrade Modal
- Blurred content is non-interactive (click-through disabled)

## Responsive Behavior

- **Mobile (< 768px):** Paywall cards go full-width; Full Upgrade Modal stacks plans vertically (1 column); Trial Banners stack text and CTA vertically; blurred backgrounds scale proportionally
- **Tablet (768px–1023px):** Paywall cards centered at comfortable width; Full Upgrade Modal uses 3 columns if space permits, otherwise 2+1; Trial Banners maintain horizontal layout
- **Desktop (1024px+):** Full layouts as designed; Full Upgrade Modal shows 3-column plan grid; all elements at max-width constraints

## Content

| Element | Content Type | Example |
|---------|-------------|---------|
| Search paywall heading | Dynamic | "Search all 47 decisions" |
| Search paywall limit text | Static | "Free plan searches the last 10 decisions." |
| Starter features list | Static | "Unlimited nodes & workspaces, Full Decision DNA search, 100 LazyMind queries/day, Import from Notion/Linear/Trello" |
| Node limit count | Dynamic | "50 of 50" |
| AI query count | Dynamic | "10 / 10 queries used today" |
| AI reset note | Static | "Resets at midnight IST." |
| Tier table | Static | Free=10/day, Starter=100/day, Pro=500/day, Business=Unlimited |
| Health Dashboard description | Static | "See quality trends, outcome distribution, top decision makers, and AI insights across your team." |
| Plan names | Static | Starter, Pro, Business |
| Annual prices (INR) | Static | 415, 832, 2,499 per seat/mo |
| Monthly prices (INR) | Static | 499, 999, 2,999 per seat/mo |
| Trial banner — active | Dynamic | "Pro trial -- 11 days remaining" |
| Trial banner — expiring | Dynamic | "Pro trial expires in 2 days" |
| Trial banner — expired | Static | "Your Pro trial has ended. You're now on the Free plan." |
| Trial/billing notes | Static | "14-day free trial on all paid plans. No credit card required. Cancel anytime." |

## Constraints

- Paywall copy must lead with value gained, not features lost
- All pricing must be displayed in INR with per-seat-per-month format
- "14-day free trial" and "Cancel anytime" must appear near every upgrade CTA
- Blurred content must be realistic (matching actual layouts) to demonstrate what users are missing
- "Maybe later" must be available on soft paywalls (Node Limit) but not on hard gates (Health Dashboard)
- Trial Banners must not be dismissible — they persist until the user upgrades or the trial state changes
- Annual toggle must show accurate discounted pricing (17% savings)

## References

- Mockup: `mockups/upgrade-paywall-modal.html`
- Related features: Feature 02 (Pricing Page), Feature 13 (Billing & Subscription), Feature 08 (Decision Health Dashboard), Feature 10 (LazyMind AI Panel)
- Pricing: Free (0), Starter (499/mo or 415/mo annual), Pro (999/mo or 832/mo annual), Business (2,999/mo or 2,499/mo annual) — all per seat in INR
