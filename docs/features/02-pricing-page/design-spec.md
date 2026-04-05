# Design Spec — Pricing Page

> **Feature**: 02 — Pricing Page
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A dedicated pricing page with 4-tier card layout, monthly/annual billing toggle, 15-row feature comparison table, and 6-item FAQ accordion.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: 4 tiers instead of 3 (adding Starter between Free and Pro); Starter as "Most Popular" with primary highlight; INR pricing with USD equivalents; per-seat model; feature comparison table for detailed tier differentiation.

---

## Section Breakdown

### Pricing Hero

**Purpose**: Set expectations with a clear, trust-building headline.
**Layout**: Centered text block with generous top padding (pt-20 sm:pt-28).
**Key elements**:
- Headline: "Simple, transparent pricing" in 4xl-6xl extrabold
- Subtitle: "Start free. Upgrade when you're ready. No credit card required."

**Rationale**: Minimal hero keeps focus on the pricing cards below. "No credit card required" removes friction.

---

### Billing Toggle

**Purpose**: Let users compare monthly vs annual pricing.
**Layout**: Centered horizontal group with labels, switch, and savings badge.
**Key elements**:
- "Monthly" label (bold when active, muted when inactive)
- Toggle switch (role="switch", aria-checked) with sliding knob
- "Annual" label (bold when active, muted when inactive)
- "Save 17%" green pill badge

**Rationale**: Toggle pattern is familiar from competitor pricing pages. 17% savings is meaningful but not so large as to seem desperate.

---

### Pricing Cards

**Purpose**: Present all 4 tiers for side-by-side comparison with clear upgrade path.
**Layout**: 4-column grid (xl), 2-column (md), single column (mobile). Equal-height flex columns.
**Key elements**:

**Free card**:
- White background, slate-200 border
- Rs.0/month, "Free forever"
- 6 features: 1 workspace, 3 members, 50 nodes, 10 decisions, Basic LazyMind (10 queries/day), Community support
- CTA: "Start Free" outline button

**Starter card (highlighted)**:
- White background, primary-500 border-2, shadow-lg
- "Most Popular" badge positioned -top-3.5 centered
- Rs.499/month (Rs.415 annual), ~$5.99 (~$4.99) USD
- 9 features: Everything in Free + unlimited workspaces/members/nodes, 100 decisions, Decision DNA search, Full LazyMind (100 queries/day), Email support, Import from Notion/Linear/Trello
- CTA: "Start Free Trial" primary filled button

**Pro card**:
- White background, slate-200 border
- Rs.999/month (Rs.832 annual), ~$11.99 (~$9.99) USD
- 10 features: Everything in Starter + unlimited decisions, Health Dashboard, Quality analytics, Outcome tracking, PULSE dashboards, Automation engine, Priority support, Custom templates, Data export (JSON/CSV)
- CTA: "Start Free Trial" primary filled button

**Business card**:
- White background, slate-200 border
- Rs.2,999/month (Rs.2,499 annual), ~$35.99 (~$29.99) USD
- 8 features: Everything in Pro + SSO/SAML, Advanced admin controls, Dedicated account manager, Custom integrations, SLA guarantee, Audit logs, Unlimited LazyMind queries
- CTA: "Contact Sales" outline button

**Rationale**: Starter highlighted as "Most Popular" guides majority of users to the Rs.499 tier. Progressive "Everything in X, plus:" pattern makes upgrade value clear. USD equivalents help international visitors.

---

### Feature Comparison Table

**Purpose**: Detailed feature-by-feature comparison for thorough evaluation.
**Layout**: Full-width table, 5 columns (Feature + 4 tiers), horizontally scrollable on mobile (min-width 640px).
**Key elements**:
- Header row with tier names, Starter column highlighted with "Most Popular" subtitle
- 15 feature rows: Workspaces, Members, Nodes, Decisions, Decision DNA Search, Quality Scores, Outcome Tracking, Health Dashboard, LazyMind AI queries, PULSE, Automation, Import, Export, Templates, Support, SSO
- Values: Numeric limits, checkmarks (SVG), dashes for unavailable, or text descriptions
- Starter column has subtle primary-50/30 background tint
- Rows have hover:bg-slate-50

**Rationale**: Table enables granular comparison that cards alone cannot provide. Starter column tint reinforces the recommended tier. Feature ordering puts unique differentiators (Decision DNA, Quality Scores) early.

---

### FAQ Accordion

**Purpose**: Address common purchase objections and build confidence.
**Layout**: Single column, max-width 768px centered, gray section background.
**Key elements**:
- 6 FAQ items in white rounded cards with border
- Each item: Button trigger with question text + chevron, collapsible answer div
- Questions: "Can I try before I buy?", "How does per-seat pricing work?", "Can I switch plans?", "Do you support UPI / Indian payments?", "Is there a discount for startups?", "What happens when I hit the free plan limit?"

**Rationale**: FAQ placement after pricing addresses objections at the decision point. Indian payments question (UPI, Razorpay) is essential for the target market. Accordion keeps the section compact.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default / Monthly** | Monthly prices shown. Toggle knob left. Monthly label bold. Annual label muted. | Initial state |
| **Annual** | Annual prices shown (Rs.415, Rs.832, Rs.2,499). Toggle knob right, background primary. Annual label bold. "billed annually" note visible. | JS toggles classes and text |
| **FAQ collapsed** | All answers hidden (max-height: 0). Chevrons pointing down. | Default state |
| **FAQ expanded** | Clicked item's answer visible (max-height: 200px). Chevron rotated 180deg. | Multiple can be open |
| **Hover on row** | Table row gets bg-slate-50 | CSS :hover |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | 1-column pricing cards. Table scrolls horizontally. FAQ full width. Hamburger menu. |
| **Tablet** (640-1024px) | 2-column pricing cards (md:grid-cols-2). Table fits or scrolls. |
| **Desktop** (> 1024px) | 4-column pricing cards (xl:grid-cols-4). Full table visible. All sections at max width. |

---

## Cognitive Load Assessment

- **Information density**: High -- 4 pricing cards + 15-row comparison table + 6 FAQ items, but logically grouped and progressively disclosed
- **Visual hierarchy**: Clear -- page title draws first attention, then the highlighted Starter card with "Most Popular" badge, then feature table. FAQ is a secondary scan area.
- **Progressive disclosure**: Pricing cards provide overview; comparison table provides detail; FAQ addresses lingering questions. Annual pricing is hidden behind toggle.
- **Interaction complexity**: Low -- 2 interaction types (toggle switch, FAQ accordion). No forms, no multi-step flows.

---

## Accessibility Notes

- **Contrast**: White cards with slate-900 text on white background. Primary blue checkmarks and badges. USD equivalent text is slate-400 (xs size) -- may need contrast verification.
- **Focus order**: Header -> billing toggle -> pricing cards (left to right) -> CTA buttons -> comparison table -> FAQ triggers -> footer
- **Screen reader**: Billing toggle has role="switch" and aria-checked. FAQ triggers have aria-expanded. Table uses proper thead/tbody semantics. Checkmarks in table are decorative SVGs (no alt text needed since the column header provides context).
- **Keyboard**: Toggle switch is a button. FAQ triggers are buttons. All CTAs are anchor elements. Table is navigable with standard tab order.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| 4-tier pricing (vs 3 on landing page) | Pricing page is the comprehensive view with Starter tier added | No -- landing page is simplified |
| USD equivalent shown | International audience needs reference pricing | No -- pricing page specific |
| Comparison table with Starter column tint | Reinforces recommended plan choice | No -- contextual treatment |
