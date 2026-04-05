# Design Spec — Marketing Pages

> **Feature**: 32 — Marketing Pages
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: 5 light-theme marketing pages (About, Features, Changelog, vs Notion Comparison, Blog) with shared navigation, a floating tab switcher for mockup navigation, dark preview cards for app UI showcases, and fade-in transitions.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Light theme for all marketing pages (contrast with dark app); floating pill switcher for easy mockup review; dark app-preview cards on Features page to show actual UI; comparison table uses checkmarks and color-coding for quick scanning; blog uses featured-post hero pattern.

---

## Section Breakdown

### Floating Page Switcher
**Purpose**: Navigate between the 5 marketing pages in the mockup
**Layout**: Fixed top-4 left-1/2 -translate-x-1/2 z-50, bg-slate-900 rounded-full p-1
**Key elements**: 5 pill buttons (About, Features, Changelog, vs Notion, Blog), active state: bg-white text-slate-900, inactive: text-white
**Rationale**: Mockup-specific navigation — allows reviewing all 5 pages without separate files.

### About Page
**Purpose**: Communicate company mission and team
**Layout**: Shared nav (h-16 max-w-6xl) → hero (max-w-4xl centered) → 3-col mission grid (max-w-5xl) → team section (bg-slate-50)
**Key elements**:
- Hero: "better than tool soup" headline (text-4xl font-extrabold), description paragraph
- Mission pillars: 3 cards — Decision-First (blue icon, blue-50 bg), 7 Primitives (orange icon, orange-50 bg), Built for India (emerald icon, emerald-50 bg) — each w-14 h-14 rounded-2xl icon
- Team: Founder avatar (w-24 h-24 gradient purple→fuchsia), name, role, "Hiring soon" note
**Rationale**: Three pillars establish the product thesis. Solo founder transparency builds trust.

### Features Page
**Purpose**: Deep-dive into key platform capabilities
**Layout**: Header (centered) → 3 alternating 2-col grid sections (gap-12)
**Key elements**:
- Decision DNA: Orange badge, feature list with orange dots, dark preview card showing quality score (84) and status badges
- Canvas: Blue badge, dark preview showing node graph with TASK/DOC/DECISION nodes and connecting edges
- LazyMind AI: Cyan badge, dark preview showing AI chat interface with suggestion messages
**Rationale**: Alternating image/text layout keeps scrolling engaging. Dark preview cards show actual app UI in context.

### Changelog Page
**Purpose**: Show product evolution and build momentum
**Layout**: Centered header → vertical timeline (border-l-2 border-slate-200)
**Key elements**: 5 versions (v0.5 → v0.1), each with colored dot (emerald/blue/orange/purple/slate), version badge (font-mono bg-slate-100), date (text-slate-400), description bullets, category tags (Feature/Improvement/AI)
**Rationale**: Timeline format shows momentum. Color-coded dots provide instant category recognition.

### Comparison Page (vs Notion)
**Purpose**: Position Lazynext against the primary competitor
**Layout**: Centered header → comparison table (max-w-3xl, rounded-2xl border)
**Key elements**: 3-column table (Feature, Lazynext, Notion), 9 rows (Canvas, Decision DNA, Threads, Automation, AI, Pricing, Real-time, Import, Mobile), green checkmarks for supported, red X for unsupported, text descriptions for nuanced comparisons, alternating row backgrounds (bg-slate-50)
**Rationale**: Direct comparison table is the most effective format for competitive positioning. Lazynext advantages highlighted in green.

### Blog Page
**Purpose**: Content marketing hub
**Layout**: Centered header → featured post (full-width gradient card) → 4-column article grid
**Key elements**: Featured post with gradient bg (blue→purple), category badge, title, excerpt, "Read Article" link; grid cards with category badges (color-coded: Product emerald, Engineering blue, Design purple, Decision orange), read time, date, author
**Rationale**: Featured post pattern draws attention to latest/best content. Grid provides efficient browsing.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **About active** | About page visible, tab selected | Default page |
| **Features active** | Features page visible | 3 deep-dive sections |
| **Changelog active** | Timeline visible | 5 version entries |
| **Comparison active** | Table visible | 9-row comparison |
| **Blog active** | Featured + grid visible | 5 articles total |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Single column layouts, nav collapses, comparison table scrolls, blog grid stacks |
| **Tablet (640–1024px)** | 2-column grids, full nav visible |
| **Desktop (> 1024px)** | Full multi-column layouts as designed |

---

## Cognitive Load Assessment

- **Information density**: Moderate per page but well-sectioned — each page has a clear single purpose
- **Visual hierarchy**: Strong — headlines, subheads, and visual elements create clear scanning paths
- **Progressive disclosure**: 5 separate pages keep each topic focused
- **Interaction complexity**: Minimal — reading, scrolling, CTA clicks

---

## Accessibility Notes

- **Contrast**: Dark text on white backgrounds meets AAA. Brand blue (#4F6EF7) on white meets AA for large text.
- **Focus order**: Nav links → page content → CTA buttons → footer
- **Screen reader**: Comparison table needs proper th/td structure. Timeline needs landmark labels. Images need alt text.
- **Keyboard**: Tab through nav, page switcher buttons, CTA links. Page switcher needs arrow key support.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Light theme (bg-white) | Marketing pages use light theme per design system spec | No — documented in design system |
| Floating pill switcher | Mockup-specific navigation, not part of production UI | No |
