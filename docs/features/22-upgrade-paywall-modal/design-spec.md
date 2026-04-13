# Design Spec — Upgrade & Paywall Modals

> Feature: 22 / Date: 2026-04-05 / Fidelity: Mockup / Status: Draft / Iterations: 1

## Overview

**What was designed:** Six upgrade and paywall UI variants — Decision Search Paywall, Node Limit, AI Query Limit, Health Dashboard Gate, Full Upgrade Modal, and Trial Banners (3 sub-states). Each variant surfaces contextually when a user hits a plan limit or encounters a gated feature, presenting a clear upgrade path with INR pricing.

**Design brief link:** `design-brief.md`

**Key decisions:**
- Paywalls use blurred real content behind the upgrade card to show users what they are missing rather than hiding it entirely
- Each paywall is contextual to the specific limit hit, with tailored copy and relevant feature highlights
- The Full Upgrade Modal uses an annual/monthly toggle with annual pricing shown by default to encourage longer commitments
- Trial Banners use a 3-state color progression (blue > amber > red) to create escalating urgency
- "Most Popular" badge is placed on Starter to guide the majority of conversions to the entry-level paid plan

## Section Breakdown

### 1. Decision Search Paywall
- **Purpose:** Convert free users who search decisions beyond the 10-decision free limit
- **Layout:** bg-slate-900 border rounded-xl panel (max-w-lg), stacked: search bar > blurred results > gradient fade > upgrade card
- **Key elements:**
  - Search bar context (px-5 py-3 border-b): magnifying glass SVG + search query text "Why did we choose Supabase?" in text-sm text-slate-300
  - 3 blurred result rows (opacity-30 blur-[2px]): orange circle placeholders + skeleton text lines simulating real search results
  - Gradient fade overlay (bg-gradient-to-t from-slate-900) transitioning from results to upgrade card
  - Upgrade card (bg-slate-800 border border-[#4F6EF7]/30 rounded-xl p-5, max-w-sm centered):
    - Search icon in blue circle (bg-[#4F6EF7]/10)
    - "Search all 47 decisions" heading (text-sm font-semibold)
    - Limit explanation: "Free plan searches the last 10 decisions"
    - Feature list panel (bg-slate-900/50 rounded-md p-2.5): 4 items with checkmarks — unlimited nodes, full Decision DNA search, 100 LazyMind queries/day, import tools
    - CTA: "Upgrade to Starter -- 499/seat/mo" (w-full bg-[#4F6EF7])
    - Footer: "14-day free trial. Cancel anytime." (text-[10px] text-slate-600)
- **Rationale:** Showing the actual search query and blurred results creates maximum FOMO. The upgrade card appears naturally below the results, not as a disruptive popup. Feature list contextualizes the value beyond just search.

### 2. Node Limit
- **Purpose:** Alert free users when they hit the 50-node workspace cap
- **Layout:** Centered card (max-w-md), bg-slate-900 border border-amber-500/30 rounded-xl p-6
- **Key elements:**
  - Amber warning icon (w-12 h-12 bg-amber-500/10, warning triangle in amber-400)
  - "Node limit reached" heading (text-sm font-semibold)
  - Usage text: "You've used 50 of 50 nodes on the Free plan" with "50 of 50" in bold slate-200
  - Full progress bar (w-full h-2 bg-slate-800 rounded-full, amber-500 fill at 100%)
  - Upgrade pitch (text-xs text-slate-500): "unlimited nodes" in bold slate-300
  - CTA: "Upgrade to Starter -- 499/seat/mo" (w-full bg-[#4F6EF7])
  - Dismiss: "Maybe later" text button (w-full text-xs text-slate-500)
- **Rationale:** Amber border signals warning without alarm. Progress bar at 100% provides immediate visual confirmation of the limit. "Maybe later" respects user agency on soft limits.

### 3. AI Query Limit
- **Purpose:** Inform users when daily LazyMind AI queries are exhausted
- **Layout:** Compact card (max-w-sm), bg-slate-900 border rounded-xl p-5
- **Key elements:**
  - Header row: sparkle icon in amber circle (w-8 h-8) + "LazyMind daily limit reached" (text-sm font-semibold) + "10 / 10 queries used today" (text-[10px] text-slate-500)
  - Progress bar (w-full h-1.5, amber-500 at 100%)
  - Reset note: "Resets at midnight IST. Or upgrade for more queries:" (text-xs text-slate-400)
  - Tier comparison table (bg-slate-800/50 rounded-md p-3): 4 rows showing plan name vs. daily limit — Free=10, Starter=100 (highlighted in blue font-medium), Pro=500, Business=Unlimited
  - CTA: "Upgrade for More Queries" (w-full bg-[#4F6EF7] text-xs)
- **Rationale:** Tier table lets users self-select the right plan based on usage needs. Highlighting Starter in blue guides most users to the entry plan. Midnight IST reset note is specific and transparent.

### 4. Health Dashboard Gate
- **Purpose:** Preview the Business-plan Health Dashboard to drive upgrades from Starter/Pro users
- **Layout:** bg-slate-900 border rounded-xl panel (max-w-lg), blurred background + centered overlay
- **Key elements:**
  - Blurred background (blur-[3px] opacity-40): simulated dashboard with 4-column stat card grid (h-20 each) + 2-column chart grid (h-36 each), all bg-slate-800 rounded-lg
  - Overlay backdrop (absolute inset-0 bg-slate-900/60)
  - Centered upgrade card (bg-slate-800 border border-purple-500/30 rounded-xl p-6, max-w-xs, shadow-xl):
    - Chart icon in purple circle (bg-purple-500/10)
    - "Decision Health Dashboard" heading
    - Feature description: quality trends, outcome distribution, top decision makers, AI insights
    - "Business Plan" badge (bg-purple-500/10 text-purple-400 text-[9px] rounded-full)
    - CTA: "Upgrade to Business -- 2,999/seat/mo" (w-full bg-[#4F6EF7])
    - Fallback: "or start with Pro at 999/seat/mo" (text-[10px] text-slate-600)
- **Rationale:** Blurred preview creates desire by showing the dashboard layout users could access. Purple border ties to the premium/Business tier branding. Fallback Pro mention captures users not ready for Business.

### 5. Full Upgrade Modal
- **Purpose:** Comprehensive plan comparison for informed purchasing decisions
- **Layout:** Centered overlay (max-w-xl), bg-slate-900 border rounded-xl, stacked: header > toggle > plans > footer
- **Key elements:**
  - Header (px-6 py-4 border-b): "Choose Your Plan" (text-base font-semibold) + close button (w-7 h-7)
  - Billing toggle (py-3 border-b): "Monthly" / "Annual" labels with toggle switch, "Save 17%" green badge visible on annual
  - 3-column plan grid (p-5 gap-3):
    - **Starter** (border-[#4F6EF7], bg-[#4F6EF7]/5): "Most Popular" badge (absolute -top-2.5, bg-[#4F6EF7]), price 415/seat/mo annual, features: unlimited everything, Decision DNA search, LazyMind AI 100/day, import tools, email support; "Start Free Trial" primary CTA
    - **Pro** (border-slate-700): price 832/seat/mo annual, features: everything in Starter + Health Dashboard, PULSE dashboards, automation engine, priority support; "Start Free Trial" secondary CTA
    - **Business** (border-slate-700): price 2,499/seat/mo annual, features: everything in Pro + SSO/SAML, audit logs, unlimited AI, dedicated support; "Contact Sales" secondary CTA
  - Footer (px-5 pb-4): "14-day free trial on all paid plans. No credit card required. Cancel anytime." (text-[10px] text-slate-600)
- **Rationale:** Starter gets visual emphasis (blue border, tinted bg, "Most Popular" badge) to guide majority of conversions. Annual pricing shown by default with "Save 17%" to incentivize commitment. "billed annually" note sets billing expectation.

### 6. Trial Banners
- **Purpose:** Persistent in-app notification of trial status with escalating urgency
- **Layout:** 3 horizontal banners (max-w-xl centered), each rounded-lg px-4 py-2.5, flex row with text left and CTA right
- **Key elements:**
  - **Active trial** (bg-[#4F6EF7]/10 border-[#4F6EF7]/30): sparkle icon, "Pro trial -- 11 days remaining", progress bar (w-24 h-1.5, 21% fill in blue), "Upgrade Now" button (bg-[#4F6EF7])
  - **Expiring soon** (bg-amber-500/10 border-amber-500/30): warning icon (amber), "Pro trial expires in 2 days" bold + feature loss reminder (Decision DNA search, PULSE, 100 AI queries/day), "Upgrade Now" button (bg-amber-500)
  - **Expired** (bg-red-500/10 border-red-500/30): warning icon (red), "Your Pro trial has ended. You're now on the Free plan." bold + upgrade prompt, "Upgrade" button (bg-[#4F6EF7])
- **Rationale:** Color progression (blue > amber > red) mirrors urgency levels. Active state is informational, expiring state names specific features being lost, expired state is direct about downgrade. Non-dismissible to maintain conversion pressure.

## States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Decision Search Paywall | Blurred results + inline upgrade card | Free user searches beyond 10 decisions |
| Node Limit | Amber-bordered warning card with full progress bar | Free user creates 50th node |
| Node Limit dismissed | Card hidden | "Maybe later" clicked (session-scoped) |
| AI Query Limit | Usage counter at max, tier table visible | User exhausts daily LazyMind queries |
| AI Query Limit reset | Card hidden, queries available | Midnight IST rollover |
| Health Dashboard Gate | Blurred dashboard + purple overlay card | Non-Business user visits Health Dashboard |
| Upgrade Modal — annual | Annual prices shown, toggle right, "Save 17%" visible | Default state / toggle to annual |
| Upgrade Modal — monthly | Monthly prices shown, toggle left, no savings badge | Toggle to monthly |
| Trial — active | Blue banner, progress bar, days remaining | During 14-day trial, > 3 days left |
| Trial — expiring | Amber banner, warning icon, feature loss reminder | 3 days or fewer remaining |
| Trial — expired | Red banner, downgrade notice | Trial period ended, not upgraded |

## Responsive Behavior

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| < 768px (Mobile) | Single column | Full Upgrade Modal stacks plans vertically (3 rows); Trial Banners stack text above CTA; paywall cards go full-width; blurred backgrounds scale down |
| 768px–1023px (Tablet) | Mixed | Upgrade Modal may use 2+1 column layout; paywall cards centered; Trial Banners maintain horizontal layout |
| 1024px+ (Desktop) | Full width | 3-column plan grid; all paywalls at max-width constraints; Trial Banners inline with app header |

## Cognitive Load Assessment

- **Information density:** Moderate across variants — each paywall focuses on one limit with one upgrade path; Full Upgrade Modal is the densest with 3 plans and feature lists but is organized in scannable columns
- **Visual hierarchy:** Strong — each paywall leads with the limit/problem (icon + heading), explains the value, then presents the CTA; Starter plan is visually emphasized in the Full Upgrade Modal
- **Progressive disclosure:** Good — individual paywalls show only the relevant plan; Full Upgrade Modal is the comprehensive view accessed intentionally; Trial Banners show minimal info with CTA to modal
- **Interaction complexity:** Low — each paywall has 1-2 actions (upgrade or dismiss); Full Upgrade Modal adds a toggle but plan selection is single-click

## Accessibility Notes

- **Contrast:** Upgrade CTAs (white on #4F6EF7) meet AA; amber/red text on tinted backgrounds should be verified; "Maybe later" (text-slate-500) may be too low contrast for interactive element — consider slate-400
- **Focus management:** Modal must trap focus and return to trigger on close; paywall cards within page flow should not trap focus; Trial Banners are passive (CTA focusable via normal tab order)
- **Screen reader:** Blurred content areas should use aria-hidden="true"; upgrade cards need descriptive headings; progress bars need aria-valuenow/aria-valuemax; Trial Banners should use role="status" for dynamic state changes
- **Keyboard:** All CTAs are buttons, focusable by default; modal close via Escape key; "Maybe later" must be keyboard accessible (currently a button element); toggle in Full Upgrade Modal needs aria-pressed or checkbox semantics

## Design System Deviations

| Element | Deviation | Reason |
|---------|-----------|--------|
| Blurred content backgrounds | blur-[2px] to blur-[3px] with reduced opacity | Paywall-specific technique to show gated content preview; not used in standard components |
| Amber/purple border accents | border-amber-500/30, border-purple-500/30 | Tier-specific color coding — amber for limits/warnings, purple for Business-tier features; standard borders use slate-700 |
| "Most Popular" floating badge | absolute -top-2.5 with translate | Pricing-specific design pattern; badge extends outside card bounds for visual emphasis |
| Gradient fade overlay | bg-gradient-to-t from-slate-900 via-slate-900 to-transparent | Decision Search Paywall-specific; creates smooth transition from blurred results to upgrade card |
| Non-dismissible banner | No close button on Trial Banners | Business requirement — trial urgency must persist; standard notifications typically allow dismissal |
