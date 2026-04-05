# Design Brief — Landing Page

> **Feature**: 01 — Landing Page
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Full marketing landing page for Lazynext, introducing the platform's value proposition, features, and pricing to prospective users.
**Why**: Convert visitors into sign-ups by clearly communicating that Lazynext replaces fragmented tool stacks (Notion, Linear, Slack, etc.) with a single unified workspace.
**Where**: Root public URL (lazynext.com) -- the first page any visitor sees.

---

## Target Users

- **Prospective team leads / PMs**: Need to understand what Lazynext replaces and why it's better than their current stack.
- **CTOs / Engineering Managers**: Need to see technical credibility (Decision DNA, AI, graph-based architecture) and pricing justification.
- **Individual contributors**: Need to see that it simplifies their daily workflow rather than adding another tool.

---

## Requirements

### Must Have
- [x] Fixed header with navigation (Features, Pricing, Templates, Blog) and Sign In / Start Free CTA
- [x] Hero section with tagline "One platform that replaces every tool your team is already misusing", subtitle, dual CTAs (Start Free, Watch Demo), and animated canvas mockup showing node types
- [x] Social proof bar ("Trusted by 1,200+ teams") with placeholder logos
- [x] Problem section ("The graveyard of half-used tools") with 2x2 grid of competitor cards (Notion, Linear, Slack, Airtable) funneling into Lazynext card
- [x] Seven primitives section (TASK, DOC, DECISION, THREAD, PULSE, AUTOMATION, TABLE) in a 4-column grid
- [x] Decision DNA hero feature section with decision card mockup showing quality score 84/100, resolution, outcome tracking, and full lineage
- [x] LazyMind AI section with chat mockup and feature list (analyze workflows, generate from descriptions, weekly digest, quality scoring)
- [x] Consolidation map SVG showing 6 tools converging into Lazynext with price comparison ($171 vs $19)
- [x] Pricing section with monthly/annual toggle and 3 tiers (Free at Rs.0, Pro at Rs.499, Business at Rs.999) in INR
- [x] Testimonials section with 3 cards (Priya Raghavan, Arjun Krishnamurthy, Sara Mehta) -- 5-star reviews
- [x] CTA banner ("Ready to stop switching apps?") with blue gradient background
- [x] Footer with 5-column layout (Brand, Product, Company, Legal, Support)

### Nice to Have
- [x] Floating animation on hero canvas node cards
- [x] Dashed animated SVG connection lines in consolidation map
- [x] Card hover effects with translateY and box-shadow transitions
- [x] Mobile hamburger menu

### Out of Scope
- Actual video embed for "Watch Demo"
- Blog content
- Template gallery
- Real company logos for social proof

---

## Layout

**Page type**: Full page (long-scroll marketing page)
**Primary layout**: Single column, max-width 1280px centered
**Key sections** (in order):
1. **Header**: Fixed top bar with logo, nav links, Sign In, Start Free button
2. **Hero**: Gradient background (blue-white-purple), headline, subtitle, dual CTAs, dark canvas mockup with 4 floating node cards
3. **Social Proof Bar**: Logo placeholder row
4. **Problem Section**: "Graveyard of half-used tools" -- 2x2 competitor grid + arrow + Lazynext card
5. **Seven Primitives**: 4-column card grid on gray background, DECISION card highlighted with "Nothing else does this" badge
6. **Decision DNA**: Two-column layout with decision card mockup (left) and feature text + checklist (right)
7. **LazyMind AI**: Two-column layout with dark chat mockup (left) and feature list with icons (right)
8. **Consolidation Map**: SVG diagram showing 6 tools converging into Lazynext + price comparison
9. **Pricing**: Monthly/annual toggle, 3-tier card grid (Free, Pro featured, Business)
10. **Testimonials**: 3-column card grid on gray background
11. **CTA Banner**: Blue gradient rounded card with headline and button
12. **Footer**: Dark background, 5-column grid with links

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Full page loads with all sections visible, hero animation playing, monthly pricing shown |
| **Empty** | N/A -- static marketing page |
| **Loading** | Standard browser load; Lucide icons initialized via script |
| **Error** | N/A -- no dynamic data |
| **Success** | N/A |

**Key interactions**:
- **Pricing toggle**: Click Monthly/Annual to switch displayed prices (Rs.0 / Rs.499/Rs.415 / Rs.999/Rs.832)
- **Smooth scroll**: Anchor links (#features, #pricing) scroll smoothly to sections
- **Mobile menu**: Hamburger toggles a dropdown nav on screens < md
- **Card hover**: Cards lift 4px with enhanced shadow on hover
- **Node animation**: Hero canvas nodes float with a 3s ease-in-out infinite animation

---

## Responsive Behavior

- **Mobile**: Single column throughout. Hero text stacks. Node cards wrap in 2-column flex. Problem section stacks vertically with down-arrow. Primitives become 1-column. Pricing becomes 1-column. Footer becomes 2-column grid. Hamburger menu replaces nav.
- **Tablet**: Two-column grids where applicable. Hero canvas shrinks. Pricing may go 2-column on md.
- **Desktop**: Full layout as designed -- 1280px max width, multi-column grids, fixed header with full nav, side-by-side sections for Decision DNA and LazyMind.

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Hero headline** | Static | "One platform that replaces every tool your team is already misusing." |
| **Hero subtitle** | Static | "Stop switching apps. Start shipping work..." |
| **Social proof** | Static | "Trusted by 1,200+ teams across India and beyond" |
| **Problem heading** | Static | "The graveyard of half-used tools" |
| **Competitor cards** | Static | Notion ("Docs no one reads"), Linear ("Tasks that drift"), Slack ("Decisions lost in threads"), Airtable ("Spreadsheets with lipstick") |
| **Primitive cards** | Static | 7 cards: TASK, DOC, DECISION, THREAD, PULSE, AUTOMATION, TABLE with "Replaces: X" text |
| **Decision DNA** | Static | Decision card mockup with D-127, quality score 84/100, "Which payment processor for India launch?" |
| **LazyMind chat** | Static | User asks about pricing decisions; AI responds with 3 decision summaries |
| **Pricing tiers** | Dynamic toggle | Free Rs.0 / Pro Rs.499 (Rs.415 annual) / Business Rs.999 (Rs.832 annual) |
| **Testimonials** | Static | 3 quotes from Priya Raghavan, Arjun Krishnamurthy, Sara Mehta |
| **CTA** | Static | "Ready to stop switching apps?" with "Start Free -- No credit card required" |
| **Footer tagline** | Static | "Built in India. Priced for humans." |

---

## Constraints

- Light theme only (white background, slate text) -- consistent with marketing pages
- Inter font family (400-900 weights) loaded from Google Fonts
- Tailwind CSS via CDN for styling
- Lucide icons library for all iconography
- Primary color: #4F6EF7, primary-dark: #3B5AE0
- Max site width: 1280px
- No backend dependencies -- fully static HTML

---

## References

- Competitors: Notion marketing page, Linear landing page, Slack homepage
- Color system: Lazynext design system (primary blue #4F6EF7)
- Typography: Inter from Google Fonts
