# Design Spec — Billing & Subscription

> Feature: 13 — Billing & Subscription
> Date: 2026-04-05
> Fidelity: Mockup
> Status: Draft
> Iterations: 1

---

## Overview

**What was designed:** A full-page billing management view containing five vertically stacked sections — current plan summary, plan comparison grid, payment method, billing history table, and usage metrics — all rendered inside the standard sidebar + top-bar app shell.

**Design brief:** `docs/features/13-billing-subscription/design-brief.md`

**Key design decisions:**
1. Stacked single-column layout (max-w-6xl) rather than tabbed sections — billing has low enough information density to fit on one scroll without tabs.
2. Plan comparison uses a 4-column card grid with the current plan visually elevated via a 2px primary border and a floating "Current Plan" badge — immediate visual anchoring.
3. Usage metrics use simple labeled progress bars (not charts) to keep cognitive load low and scanning fast.
4. Billing history is a minimal table — no pagination shown (assume small dataset per workspace).

---

## Section Breakdown

### 1. Current Plan Card

**Purpose:** Give the admin an instant summary of what they are paying right now.

**Layout:** Full-width card (bg-slate-900, rounded-xl, border slate-800). Flex row on desktop — left side holds plan name + badge + price breakdown + next billing date; right side holds two action buttons (Manage Subscription, Change Plan).

**Key elements:**
- Plan name as xl semibold text with "Current Plan" badge (bg-primary/20, text-primary, rounded-full)
- Price line: ₹499/seat/month at 2xl bold, with seat math below (4 x ₹499 = ₹1,996/month)
- Next billing date in sm text
- Two buttons: secondary "Manage Subscription" (slate-800 bg, border) and primary "Change Plan" (primary bg)

**Rationale:** Foregrounding cost breakdown and next charge date builds trust. Two distinct CTAs separate routine management from plan changes.

---

### 2. Plan Comparison Grid

**Purpose:** Let the admin compare all available tiers side by side and identify the upgrade path.

**Layout:** 4-column grid (sm:grid-cols-2, lg:grid-cols-4). Each card is a flex column with plan name, price, subtitle, feature checklist, and CTA button.

**Key elements:**
- Current plan card: 2px primary border, floating "Current Plan" badge positioned absolute -top-3
- Feature checkmarks color-coded per tier: slate-600 (Free), primary (Starter), emerald-400 (Pro), amber-400 (Business)
- CTA buttons: "Downgrade" (disabled), "Current Plan" (muted primary), "Upgrade" (filled primary), "Contact Sales" (outlined)

**Rationale:** Color-coded checkmarks create a visual gradient of value. Disabled downgrade button prevents accidental downgrade while showing it is possible through other channels.

---

### 3. Payment Method

**Purpose:** Show the active payment instrument and provide update/add actions.

**Layout:** Full-width card. Inner row (bg-slate-800/50 rounded-lg) displays card icon, masked number, expiry, and green "Default" badge. Below: two action buttons.

**Key elements:**
- Visa SVG icon (48x32 with dark blue fill, white "VISA" text)
- Card info: "Visa ending in 4242" + "Expires 12/2028"
- "Default" badge (emerald-500/20 bg, emerald-400 text)
- "Update Payment Method" and "+ Add UPI (Razorpay)" buttons (both secondary style)

**Rationale:** Showing the actual card brand and last 4 digits matches user mental model from banking apps. UPI as a secondary option targets Indian market specifically.

---

### 4. Billing History

**Purpose:** Provide an auditable record of past charges with downloadable invoices.

**Layout:** Full-width card containing a responsive table (overflow-x-auto). Five columns: Date, Description, Amount, Status, Invoice.

**Key elements:**
- Table header row in slate-500 with bottom border
- Body rows divided by slate-800 borders
- Status badges: green "Paid" (emerald-500/20) and gray "Trial" (slate-700)
- Invoice column: "Download PDF" links in primary color, or em-dash for non-invoiceable rows (Trial)

**Rationale:** Table format is the most scannable for financial data. Status badges give instant visual confirmation that payments succeeded.

---

### 5. Usage Metrics

**Purpose:** Show real-time consumption against plan limits so the admin can anticipate upgrade needs.

**Layout:** 2x2 grid inside a full-width card. Each metric has a label, value/limit text, and a horizontal progress bar.

**Key elements:**
- Nodes Used: 847 / Unlimited — primary (blue) bar at 42%
- Decisions Logged: 47 / Unlimited — emerald bar at 24%
- LazyMind Queries Today: 34 / 100 — amber bar at 34%
- File Storage: 245 MB / 5 GB — violet bar at 4.8%
- All bars use h-2, rounded-full, bg-slate-800 track

**Rationale:** Color-differentiated bars allow instant identification of each metric. "Unlimited" values still show a bar to indicate relative activity. Daily AI query limit is the most likely upgrade trigger, so amber color draws attention.

---

## States

| Component | State | Visual Treatment |
|---|---|---|
| Plan card (current) | Active | 2px primary border, "Current Plan" floating badge |
| Plan card (other) | Default | 1px slate-800 border |
| Plan card (other) | Hover | Border brightens to slate-600 |
| Upgrade button | Default | bg-primary, white text |
| Upgrade button | Hover | bg-primary/90 |
| Downgrade button | Disabled | border slate-700, text slate-400, cursor-default |
| Payment card | Default | bg-slate-800/50 with green "Default" badge |
| Invoice link | Default | text-primary |
| Invoice link | Hover | text-primary/80 |
| Status badge (Paid) | Static | emerald-500/20 bg, emerald-400 text |
| Status badge (Trial) | Static | slate-700 bg, slate-400 text |
| Usage bar | Animating | Width transitions to fill percentage |
| Manage Subscription | Hover | bg-slate-700 |

---

## Responsive Behavior

| Breakpoint | Component | Behavior |
|---|---|---|
| lg (1024px+) | Plan grid | 4 columns |
| lg | Usage metrics | 2 columns |
| lg | Current plan card | Horizontal flex (info left, buttons right) |
| sm–lg (640–1023px) | Plan grid | 2 columns |
| sm–lg | Current plan card | Stacks vertically |
| <sm (<640px) | Plan grid | 1 column |
| <sm | Billing history table | Horizontal scroll |
| <sm | Payment method row | Stacks vertically |
| <sm | Action buttons | Full width, wrap |

---

## Cognitive Load Assessment

**Information density:** Moderate-high (5 sections on one scroll). Mitigated by clear section headings, ample vertical spacing (space-y-8), and contained card boundaries.

**Scanning pattern:** Vertical — user scrolls through clearly separated sections. Current plan card at top answers "what am I paying?" immediately. Usage metrics at bottom serve as a secondary check.

**Decision complexity:** Low for routine billing checks. Plan comparison grid is the highest-complexity section but uses progressive disclosure (feature lists only visible per card).

**Cognitive load rating:** 3/5 — appropriate for a settings page that is visited infrequently but must be comprehensive when visited.

---

## Accessibility Notes

- All plan feature checkmarks are decorative SVGs; feature text carries the semantic meaning
- Status badges use both color and text labels (not color-alone)
- Progress bars should include `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` attributes
- Table uses semantic `<thead>` and `<tbody>` for screen reader navigation
- Invoice download links should specify `aria-label="Download invoice for [date]"`
- Sufficient color contrast: primary text (#e2e8f0) on slate-900 (#0f172a) exceeds 7:1 ratio
- Focus states needed on all interactive buttons and links

---

## Design System Deviations

| Deviation | Reason |
|---|---|
| Visa card icon uses white background rectangle inside dark card | Payment brand guidelines require legible logo on any background |
| Pro tier price (₹1,499) differs from the platform-level ₹999 tier listed elsewhere | Mockup shows updated pricing; confirm with product before dev |
| Business tier shows "Custom" instead of ₹2,999 | Enterprise pricing is handled via sales, not self-serve |
| Usage bar colors (emerald, amber, violet) extend beyond the standard primary palette | Differentiation by metric type requires distinct hues; acceptable as data visualization colors |
