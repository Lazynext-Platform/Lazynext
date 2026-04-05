# Design Brief — Billing & Subscription

> Feature: 13 — Billing & Subscription
> Date: 2026-04-05
> Target Fidelity: Mockup

---

## Overview

**What:** A full-page billing management experience nested under Settings, allowing workspace admins to view their current plan, compare available plans, manage payment methods, review invoicing history, and monitor real-time usage metrics against plan limits.

**Why:** Billing is a critical trust surface. Users need immediate clarity on what they are paying, what they are using, and how to upgrade or downgrade without friction. Transparent usage metrics reduce surprise charges and support-ticket volume, while a clear plan comparison grid drives upsell to Pro and Business tiers.

**Where:** Accessible via the sidebar under Settings > Billing. Full-page layout inside the main content area with the standard sidebar + top-bar chrome.

---

## Target Users

| Persona | Goal |
|---|---|
| Workspace Admin | Manage subscription, update payment, download invoices |
| Finance / Ops lead | Audit billing history, verify seat counts, download PDFs |
| Team Lead | Check usage metrics (nodes, AI queries, storage) to justify upgrade |

---

## Requirements

### Must Have
- [x] Current plan card showing plan name, per-seat price (INR), total cost, seat count, and next billing date
- [x] Plan comparison grid with four tiers: Free (₹0), Starter (₹499/seat), Pro (₹1,499/seat), Business (Custom)
- [x] Visual highlight on the current plan with a "Current Plan" badge
- [x] Payment method section showing card brand, last 4 digits, expiry, and default badge
- [x] "Update Payment Method" and "Add UPI (Razorpay)" actions
- [x] Billing history table with date, description, amount, status badge, and invoice download link
- [x] Usage metrics section with progress bars for Nodes, Decisions, AI Queries (daily), and File Storage

### Nice to Have
- [x] Manage Subscription button (opens Stripe/Razorpay portal)
- [x] Smooth scroll from "Change Plan" button to the plan comparison section
- [x] Trial line item in billing history with distinct badge

### Out of Scope
- Inline credit card form (delegated to payment provider portal)
- Tax/GST configuration
- Multi-currency support (INR only for now)
- Annual billing toggle

---

## Layout

| Attribute | Value |
|---|---|
| Page type | Settings sub-page (full width) |
| Primary layout | Single-column stacked sections, max-width 6xl |
| Sidebar | Standard app sidebar with Billing highlighted under Settings |
| Top bar | Breadcrumb: Acme Corp > Settings > Billing & Subscription |

### Key Sections (top to bottom)
1. **Current Plan Card** — plan name, badge, price breakdown, seat math, next billing date, action buttons
2. **Available Plans Grid** — 4-column card grid (Free / Starter / Pro / Business) with feature lists and CTA buttons
3. **Payment Method** — card display row with Visa icon, expiry, default badge; action buttons below
4. **Billing History** — 5-column table (Date, Description, Amount, Status, Invoice)
5. **Usage Metrics** — 2x2 grid of labeled progress bars

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| Plan cards | Default / Current / Hover | Current plan gets primary border + "Current Plan" chip; others get hover border lift |
| Change Plan button | Click | Smooth-scrolls to the plan comparison section |
| Upgrade button | Click | Initiates plan change flow (upgrade confirmation modal, not shown) |
| Downgrade button | Disabled appearance | Muted text, cursor-default — requires support contact for downgrade |
| Contact Sales button | Click | Opens sales form or mailto |
| Payment card row | Default | Shows Visa icon, masked number, expiry, green "Default" badge |
| Update Payment Method | Click | Opens payment provider portal |
| Add UPI (Razorpay) | Click | Opens Razorpay UPI setup flow |
| Invoice download | Click | Downloads PDF invoice |
| Usage bars | Realtime | Animated fill width proportional to usage/limit ratio |
| Status badges | Paid / Trial | Green for Paid, muted gray for Trial |

---

## Responsive Behavior

| Breakpoint | Adaptation |
|---|---|
| Desktop (lg+) | 4-column plan grid, 2-column usage metrics, sidebar visible |
| Tablet (sm–lg) | 2-column plan grid, stacked current plan card content, sidebar collapsible |
| Mobile (<sm) | Single-column everything, plan cards stack vertically, table scrolls horizontally |

---

## Content

| Element | Copy / Data |
|---|---|
| Page title | Billing & Subscription |
| Current plan name | Starter |
| Per-seat price | ₹499/seat/month |
| Seat count | 4 seats |
| Total monthly | ₹1,996/month |
| Next billing date | May 4, 2026 |
| Free tier limits | 3 members, 100 nodes, 10 AI queries/day, 500 MB storage |
| Starter tier limits | 10 members, Unlimited nodes, 100 AI queries/day, 5 GB storage |
| Pro tier limits | 50 members, Unlimited nodes, Unlimited AI queries, 50 GB storage, Advanced analytics |
| Business tier features | Unlimited everything, SSO & SAML, Priority support, Custom integrations |
| Payment method | Visa ending in 4242, Expires 12/2028 |
| Billing history rows | Apr 4 ₹1,996 Paid; Mar 4 ₹1,996 Paid; Feb 4 ₹1,497 Paid; Jan 4 ₹0 Trial |
| Usage: Nodes | 847 / Unlimited (42%) |
| Usage: Decisions | 47 / Unlimited (24%) |
| Usage: AI Queries | 34 / 100 daily (34%) |
| Usage: Storage | 245 MB / 5 GB (4.8%) |

---

## Constraints

- All pricing displayed in INR (₹) only
- Payment integrations assume Stripe for cards and Razorpay for UPI
- Invoice PDF download must be available for all paid invoices
- Usage metrics must update without full page reload
- Plan comparison must clearly differentiate current plan from upgrade options
- Billing page restricted to Admin role

---

## References

- Mockup: `docs/features/13-billing-subscription/mockups/billing-subscription.html`
- Design system: Inter font, dark theme (#020617 / slate-950 background), primary accent #4F6EF7
- Pricing tiers: ₹0 / ₹499 / ₹1,499 / Custom (Business)
- Similar patterns: Stripe Dashboard billing, Linear billing settings
