# Design Spec — Landing Page

> **Feature**: 01 — Landing Page
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A full-length marketing landing page for Lazynext with 12 distinct sections covering the complete value proposition, from hero through footer.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Light theme for marketing (vs dark app theme); INR pricing front-and-center; Decision DNA as the hero differentiator feature; consolidation map visualization to justify replacement narrative.

---

## Section Breakdown

### Header (Fixed)

**Purpose**: Persistent navigation and primary CTA always accessible during scroll.
**Layout**: Horizontal bar, logo left, nav center, CTAs right. Fixed position with white/80 backdrop-blur and bottom border.
**Key elements**:
- Logo: "Lazynext" text in primary blue, bold
- Nav links: Features, Pricing, Templates, Blog (hidden on mobile)
- CTAs: "Sign In" text link + "Start Free" primary button with shadow
- Mobile: Hamburger button toggles a dropdown with all links

**Rationale**: Fixed header keeps CTAs always one click away. Backdrop blur maintains visual hierarchy while scrolling over colorful sections.

---

### Hero Section

**Purpose**: Immediately communicate the core value proposition and drive sign-up action.
**Layout**: Centered single column. Gradient background (blue-white-purple). Pill badge, h1, subtitle, two CTA buttons, then dark canvas mockup below.
**Key elements**:
- Badge: "The Anti-Software Workflow Platform" in primary pill
- Headline: 4xl-6xl responsive, "One platform that replaces every tool your team is already misusing."
- Subtitle: "Stop switching apps. Start shipping work."
- CTAs: "Start Free" (primary filled) and "Watch Demo" (outline with play icon)
- Canvas mockup: Dark rounded card with window chrome (red/yellow/green dots), dot grid background, 4 floating node cards (TASK, DOC, DECISION, THREAD) with animated SVG connection lines

**Rationale**: The canvas mockup immediately shows the product's core UX -- a graph of connected nodes -- creating a visual anchor. Floating animation adds polish without being distracting.

---

### Social Proof Bar

**Purpose**: Build trust through team count and logo placeholders.
**Layout**: Centered text + horizontal row of gray rounded pill placeholders.
**Key elements**:
- Text: "Trusted by 1,200+ teams across India and beyond"
- 6 placeholder logo shapes (rounded-full gray backgrounds)

**Rationale**: Positioned immediately after hero to validate the bold claims. Placeholders indicate real logos will be swapped in.

---

### Problem Section

**Purpose**: Create resonance with the user's pain point -- too many tools, none working well together.
**Layout**: Centered heading, then a horizontal flow: 2x2 competitor grid -> arrow -> Lazynext card.
**Key elements**:
- Heading: "The graveyard of half-used tools"
- 4 competitor cards: Notion, Linear, Slack, Airtable each with a sarcastic subtitle
- Arrow (right on desktop, down on mobile)
- Lazynext card: Primary border, "Replace them all." tagline

**Rationale**: Humor and relatability ("Docs no one reads", "Tasks that drift") make the pain tangible. Visual consolidation into one card drives the replacement narrative.

---

### Seven Primitives

**Purpose**: Explain the building blocks of Lazynext and what each replaces.
**Layout**: 4-column grid (responsive to 2-col then 1-col). Gray section background.
**Key elements**:
- 7 cards: TASK (blue), DOC (green), DECISION (orange, highlighted), THREAD (purple), PULSE (cyan), AUTOMATION (slate), TABLE (amber)
- Each card: Colored icon, name, description, "Replaces: X" footer
- DECISION card: Orange border-2, "Nothing else does this" badge, ring highlight

**Rationale**: DECISION is highlighted as the unique differentiator. "Replaces: X" directly addresses migration concerns. 4-column grid provides scannable density.

---

### Decision DNA

**Purpose**: Deep-dive into the hero feature that no competitor offers.
**Layout**: Two-column grid. Decision card mockup on left, text content on right.
**Key elements**:
- Decision card mockup: D-127, "Which payment processor for India launch?", resolution text, quality score 84/100, "Validated" outcome, 5 participants, 3 linked nodes, date
- "Hero Feature" orange badge
- Heading: "Decision DNA -- Your team's institutional memory"
- 3 feature bullets: Quality scoring, Outcome tracking, Full lineage

**Rationale**: A realistic decision card with specific Indian context (Razorpay for Phase 1) grounds the feature in a relatable scenario. The quality score is the most visually striking element.

---

### LazyMind AI

**Purpose**: Demonstrate AI capability through a realistic chat interaction.
**Layout**: Two-column. Dark chat mockup on left, feature list on right.
**Key elements**:
- Chat mockup: User asks "What decisions have we made about pricing this quarter?" AI responds with 3 decision summaries and average quality score
- 4 feature items: Analyze workflows, Generate from descriptions, Weekly digest, Decision quality scoring

**Rationale**: Showing a specific, useful query-response pair is more convincing than describing AI features abstractly. The pricing decisions shown mirror actual Lazynext decisions.

---

### Consolidation Map

**Purpose**: Visualize the cost and complexity savings of switching to Lazynext.
**Layout**: SVG diagram centered, with price comparison below.
**Key elements**:
- SVG: 6 tool boxes (Notion, Linear, Trello, Slack, Zapier, Sheets) with animated dashed lines converging into a large Lazynext box
- Price comparison: $171/seat/month (6 tools, struck-through) -> $19/seat/month (1 tool)

**Rationale**: The visual convergence is immediately understandable. Price comparison creates urgency around cost savings.

---

### Pricing

**Purpose**: Present clear, transparent pricing with easy plan comparison.
**Layout**: Centered toggle + 3-column card grid.
**Key elements**:
- Monthly/Annual toggle (pill-style, "Save 17%" badge on annual)
- Free: Rs.0, 1 workspace, 3 members, 50 nodes, 10 decisions
- Pro (featured): Rs.499/seat/month (Rs.415 annual), unlimited everything, Decision DNA search, LazyMind AI
- Business: Rs.999/seat/month (Rs.832 annual), SSO/SAML, Decision Health Dashboard, advanced analytics

**Rationale**: Pro tier is visually elevated (primary background, "Most Popular" badge, shadow) to guide most users there. INR pricing signals India-first positioning.

---

### Testimonials

**Purpose**: Social proof through specific, relatable quotes.
**Layout**: 3-column card grid on gray background.
**Key elements**:
- 3 testimonial cards with 5-star ratings, quotes, avatar initials, name, and title
- Priya Raghavan (Head of Product): "We killed 5 subscriptions in one week..."
- Arjun Krishnamurthy (CTO): "LazyMind is scary good..."
- Sara Mehta (Engineering Manager): "My team went from 4 tabs to 1..."

**Rationale**: Each testimonial highlights a different value: consolidation, AI, and time savings. Indian names signal the target market.

---

### CTA Banner

**Purpose**: Final conversion push before footer.
**Layout**: Centered card with blue gradient, rounded-3xl, decorative blur elements.
**Key elements**:
- Heading: "Ready to stop switching apps?"
- Subtitle: "Join 1,200+ teams who consolidated their stack"
- CTA: "Start Free -- No credit card required" white button

**Rationale**: High-contrast blue card breaks visual monotony and creates urgency at the page bottom.

---

### Footer

**Purpose**: Navigation, legal links, and brand reinforcement.
**Layout**: Dark background (slate-900), 5-column grid (Brand, Product, Company, Legal, Support), bottom bar with tagline and copyright.
**Key elements**:
- Brand column: "Lazynext" logo + "The operating system for work" tagline
- Link columns: Product (Features, Pricing, Templates, Changelog), Company (About, Blog, Careers), Legal (Privacy, Terms), Support (Docs, Contact)
- Bottom: "Built in India. Priced for humans." + copyright 2026

**Rationale**: Standard SaaS footer pattern. "Built in India" tagline reinforces market positioning.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | All sections rendered, monthly pricing shown, hero animations running | Static marketing page |
| **Annual toggle** | Prices update: Pro Rs.415, Business Rs.832 | JS switches innerHTML values |
| **Mobile menu open** | Dropdown nav slides in below header | Hidden class toggled on click |
| **Hover** | Cards lift 4px with enhanced shadow | CSS transition on .card-hover |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Single column. Hero text smaller (4xl). Competitor grid stacks. Primitives 1-col. Pricing 1-col. Footer 2-col. Hamburger menu. |
| **Tablet** (640-1024px) | Primitives 2-col. Pricing 2-col (md). Two-column sections may stack. |
| **Desktop** (> 1024px) | Full layout: 4-col primitives, 3-col pricing, side-by-side Decision DNA and LazyMind sections, 5-col footer. |

---

## Cognitive Load Assessment

- **Information density**: High -- 12 sections with substantial content, but progressive disclosure through scroll manages this well
- **Visual hierarchy**: Clear -- Hero headline is the dominant element, followed by section headings in 3xl-4xl bold. Decision DNA card and pricing Pro tier draw secondary attention through color and elevation.
- **Progressive disclosure**: Story-arc structure: hook (hero) -> pain (problem) -> solution (primitives) -> differentiator (Decision DNA) -> intelligence (AI) -> justification (consolidation + pricing) -> trust (testimonials) -> action (CTA)
- **Interaction complexity**: Low -- only 2 interactive elements (pricing toggle, mobile menu). Everything else is scroll-and-read.

---

## Accessibility Notes

- **Contrast**: Light theme with slate-900 text on white backgrounds provides strong contrast. Primary blue (#4F6EF7) on white may need verification for small text.
- **Focus order**: Header nav -> hero CTAs -> section content in document order -> footer links
- **Screen reader**: Section headings provide clear landmarks. Hero badge uses uppercase text that screen readers will read normally. Pricing toggle uses button semantics.
- **Keyboard**: All links and buttons are natively focusable. Mobile menu toggle is a button element.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Light theme (vs dark app theme) | Marketing pages use light theme per brand guidelines | No -- intentional split |
| 3-tier pricing (vs 4-tier on pricing page) | Simplified for landing page context | No -- landing page is a summary |
| $19 USD price shown in consolidation map | Comparison against USD-priced competitors | No -- contextual |
