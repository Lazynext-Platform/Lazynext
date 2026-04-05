# Design Brief — Pricing Page

> **Feature**: 02 — Pricing Page
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A dedicated pricing page with 4-tier pricing cards, annual/monthly toggle, full feature comparison table, and FAQ accordion.
**Why**: Allow prospective and existing users to compare plans in detail and choose the right tier for their team size and needs.
**Where**: Dedicated /pricing route, linked from header nav and landing page.

---

## Target Users

- **Team leads evaluating Lazynext**: Need to compare tiers side-by-side and understand feature limits per plan.
- **Existing free users considering upgrade**: Need to see exactly what they gain by moving to Starter, Pro, or Business.
- **Finance / procurement**: Need clear per-seat pricing in INR with USD equivalents and billing cycle details.

---

## Requirements

### Must Have
- [x] Sticky header with logo, nav (Product, Pricing highlighted, Docs, Blog, Changelog), Sign In, Start Free
- [x] Pricing hero with "Simple, transparent pricing" headline and subtitle
- [x] Monthly/Annual billing toggle with "Save 17%" badge
- [x] 4-tier pricing cards in a row: Free (Rs.0), Starter (Rs.499, "Most Popular"), Pro (Rs.999), Business (Rs.2,999)
- [x] Each card: tier name, description, price with /seat/month, USD equivalent, feature list with checkmarks, CTA button
- [x] Starter card highlighted with primary border, "Most Popular" badge, and shadow
- [x] Feature comparison table with all 4 tiers as columns and 15 feature rows
- [x] FAQ accordion with 6 questions: trial, per-seat pricing, switching plans, UPI/Indian payments, startup discount, free plan limits
- [x] Footer with CTA section and links

### Nice to Have
- [x] USD equivalent prices shown below INR amounts
- [x] "billed annually" note that appears when annual toggle is active
- [x] Smooth expand/collapse animation on FAQ items
- [x] Mobile-responsive menu

### Out of Scope
- Actual payment integration
- Plan comparison calculator
- Custom enterprise pricing form

---

## Layout

**Page type**: Full page (scrollable marketing page)
**Primary layout**: Single column, max-width 1280px centered
**Key sections** (in order):
1. **Header**: Sticky top bar with logo, nav, CTAs, mobile menu
2. **Pricing Hero**: Centered headline and subtitle
3. **Billing Toggle**: Centered Monthly/Annual switch with "Save 17%" pill
4. **Pricing Cards**: 4-column grid (responsive to 2-col then 1-col) with tier cards
5. **Feature Comparison Table**: Full-width table with 5 columns (Feature + 4 tiers) and 15 rows
6. **FAQ Section**: Accordion list on gray background with 6 expandable items
7. **Footer**: CTA section and footer links

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Monthly billing shown. All FAQ items collapsed. Starter tier highlighted. |
| **Annual toggle active** | Toggle knob slides right, background turns primary blue. Prices update to annual rates. "billed annually" note appears. Labels swap emphasis. |
| **FAQ expanded** | Clicked FAQ item expands with max-height animation. Chevron rotates 180 degrees. |
| **Empty** | N/A -- static content page |
| **Loading** | Standard page load |
| **Error** | N/A -- no dynamic data |
| **Success** | N/A |

**Key interactions**:
- **Billing toggle**: Click switches between monthly/annual. Toggle knob animates. All price values update. USD equivalents update. Annual note visibility toggles.
- **FAQ accordion**: Click on question row expands/collapses answer. Chevron rotates. Only one item open at a time (or multiple -- current implementation allows multiple).
- **CTA buttons**: "Start Free" / "Start Free Trial" / "Contact Sales" per tier.

---

## Responsive Behavior

- **Mobile**: Single column pricing cards. Feature table becomes horizontally scrollable (min-width 640px). FAQ full width. Header collapses to hamburger menu.
- **Tablet**: 2-column pricing card grid (md breakpoint). Table scrollable.
- **Desktop**: 4-column pricing card grid (xl breakpoint). Full table visible. Side-by-side layout.

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Page title** | Static | "Simple, transparent pricing" |
| **Subtitle** | Static | "Start free. Upgrade when you're ready. No credit card required." |
| **Free tier** | Static | Rs.0/month, 1 workspace, 3 members, 50 nodes, 10 decisions, Basic LazyMind (10 queries/day), Community support |
| **Starter tier** | Dynamic (toggle) | Rs.499 monthly / Rs.415 annual (~$5.99/$4.99 USD), Unlimited workspaces/members/nodes, 100 decisions, Decision DNA search, Full LazyMind (100 queries/day), Email support, Import |
| **Pro tier** | Dynamic (toggle) | Rs.999 monthly / Rs.832 annual (~$11.99/$9.99 USD), Unlimited decisions, Health Dashboard, Quality analytics, Outcome tracking, PULSE, Automation, Priority support, Custom templates, Data export |
| **Business tier** | Dynamic (toggle) | Rs.2,999 monthly / Rs.2,499 annual (~$35.99/$29.99 USD), SSO/SAML, Advanced admin, Dedicated account manager, Custom integrations, SLA, Audit logs, Unlimited LazyMind |
| **Comparison rows** | Static | Workspaces, Members, Nodes, Decisions, Decision DNA Search, Quality Scores, Outcome Tracking, Health Dashboard, LazyMind AI queries, PULSE, Automation, Import, Export, Templates, Support, SSO |
| **FAQ items** | Static | 6 questions about trial, per-seat pricing, plan switching, UPI support, startup discount, free plan limits |

---

## Constraints

- Light theme marketing page (white background, slate text)
- Inter font family from Google Fonts
- Tailwind CSS via CDN
- Primary color palette: primary-50 through primary-900 based on #4F6EF7
- All pricing in INR (Rs.) with USD equivalent shown below
- Billing toggle uses aria-checked and role="switch" for accessibility
- Feature comparison table requires min-width 640px, horizontal scroll on mobile

---

## References

- Pricing page patterns: Linear, Vercel, Supabase pricing pages
- Lazynext design system colors and typography
- INR pricing benchmarks for Indian SaaS market
