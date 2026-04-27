# 🧪 Test Plan — Pricing Page

> **Feature**: 02 — Pricing Page
> **Created**: 2026-04-06 (retroactive — completed during documentation pass)

---

## Acceptance Criteria

- [x] All 4 pricing tiers (Free, Team, Business, Enterprise) render with correct USD prices (locale-formatted via `formatPrice` from `lib/i18n`)
- [x] Monthly/Annual toggle updates every plan card price simultaneously
- [x] Annual cycle shows the "Save 17%" badge and per-month equivalent
- [x] Comparison matrix renders below the cards with feature rows and per-tier checkmarks
- [x] FAQ accordion opens/closes one item at a time
- [x] Plan card "Get started" / "Upgrade" CTAs link to the correct Gumroad permalink (or `/sign-up` for Free)
- [x] Page works at 375px / 768px / 1280px breakpoints
- [x] Comparison matrix collapses into per-plan accordions below 1024px

---

## Test Cases

### Visual Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| V1 | Desktop 1280px | 4-column plan grid; comparison matrix as table; FAQ as single column | ✅ Pass |
| V2 | Tablet 768px | 2-column plan grid; matrix begins to scroll horizontally | ✅ Pass |
| V3 | Mobile 375px | 1-column plan stack; matrix → per-plan accordions | ✅ Pass |
| V4 | "Most Popular" badge | Visible on the recommended plan card; primary brand color | ✅ Pass |
| V5 | Card hover | Subtle lift + shadow; matches landing page card-hover utility | ✅ Pass |

### Interaction Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| I1 | Click Monthly/Annual toggle | Every price updates; URL gains `?cycle=annual` | ✅ Pass |
| I2 | Reload with `?cycle=annual` | Annual view persists | ✅ Pass |
| I3 | Click Free "Get started" | Navigates to `/sign-up` | ✅ Pass |
| I4 | Click Team / Business "Upgrade" | Opens Gumroad permalink (resolved from `lib/billing/plans.ts`) | ✅ Pass |
| I5 | Click Enterprise "Contact sales" | Navigates to `/contact` | ✅ Pass |
| I6 | Click an FAQ row | Row expands; previously open row collapses | ✅ Pass |

### Data Integrity Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| D1 | Pricing values sourced from `lib/utils/constants.ts` (`PLAN_PRICING_USD` + `PLAN_PRICING_USD_ANNUAL`) | No hardcoded amounts in JSX | ✅ Pass |
| D2 | All 4 Gumroad permalinks resolved | Buttons get the correct `STARTER/PRO × MONTHLY/ANNUAL` URL | ✅ Pass |
| D3 | Missing Gumroad URL env var | Buttons fall back to `/sign-up` (per `GUMROAD_URLS` defaults in `pricing/page.tsx`) | ✅ Pass |

### Accessibility Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| A1 | Heading hierarchy | h1 (page) → h2 (sections) → h3 (plans/FAQ) | ✅ Pass |
| A2 | Keyboard nav | Toggle, plan CTAs, and FAQ rows reachable; visible focus states | ✅ Pass |
| A3 | Color contrast | Body + price text meets WCAG 2.1 AA on white background | ✅ Pass |
| A4 | Toggle ARIA | `role="switch"` + `aria-checked` reflects current cycle | ✅ Pass |

### Build / Type Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| B1 | `npm run build` | No build errors | ✅ Pass |
| B2 | `npm run type-check` | Clean | ✅ Pass |
| B3 | `npm run lint` | No errors | ✅ Pass |

---

## Test Summary

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Visual | 5 | 5 | 0 | 0 |
| Interaction | 6 | 6 | 0 | 0 |
| Data Integrity | 3 | 3 | 0 | 0 |
| Accessibility | 4 | 4 | 0 | 0 |
| Build | 3 | 3 | 0 | 0 |
| **Total** | **21** | **21** | **0** | **0** |

**Result**: ✅ ALL PASS

> Note: this test plan was authored retroactively during the documentation pass. Statuses reflect the live shipped state on `main` as of 2026-04-28.
