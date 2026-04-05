# Design Spec — Decision DNA View

> **Feature**: 07 — Decision DNA View
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: A full-page decision log with search, multi-filter system, paginated decision rows, health overview analytics card (Business plan gated), and a Log Decision modal with quality score calculation.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Orange accent color for all Decision DNA features to differentiate from other primitives. Health analytics blurred behind Business plan paywall to drive upgrades. Decision rows use left-border accent and horizontal card layout for scanability.

---

## Section Breakdown

### Top Bar
**Purpose**: Global navigation and user context
**Layout**: Fixed horizontal bar (h-12), bg-slate-900 with bottom border
**Key elements**:
- Workspace logo (gradient orange "LN" badge) + workspace name + breadcrumb team name
- Center navigation links: Workflows, Canvas, Decisions (active, orange), Settings
- Right: Team presence avatars (overlapping circles with +4 count) + user avatar button
**Rationale**: Consistent app shell across all views; orange highlight on "Decisions" reinforces current location

### Left Sidebar
**Purpose**: Workspace navigation and recent workflows
**Layout**: Fixed column (w-60), hidden on mobile (lg:flex), scrollable
**Key elements**:
- Navigate section: Home, Workflows, Canvas, Decisions (active with orange icon + count badge "47"), Team, Reports
- Recent Workflows: Q2 Sprint (emerald dot), Product Roadmap (sky dot), Infrastructure (violet dot)
- Bottom: Settings link
**Rationale**: Sidebar provides persistent navigation; decision count badge serves as ambient awareness

### Header Row
**Purpose**: Page identity and primary action
**Layout**: Flex row, items centered, justify-between
**Key elements**:
- "DECISION DNA" heading (text-2xl, font-extrabold) with orange star icon
- "Log Decision" button (primary blue bg, shadow, plus icon)
**Rationale**: Bold title establishes feature identity; CTA positioned top-right per convention

### Search & Filters
**Purpose**: Enable finding and narrowing decisions
**Layout**: Search input full-width, filter row with flex-wrap below
**Key elements**:
- Search input with magnifying glass icon, placeholder "Search decisions... (e.g., 'Why did we choose Neon?')"
- Filter selects: Outcome, Quality, Date Range, Tags
- Sort select: right-aligned with ml-auto
**Rationale**: Search-first approach; filters as secondary refinement; sort separated to right

### Health Overview Card
**Purpose**: At-a-glance decision health metrics (upgrade driver)
**Layout**: Rounded card (rounded-xl), 4-column stat grid + bar chart row
**Key elements**:
- Business Plan lock badge (top-right, amber lock icon)
- Blur overlay (filter: blur(2px), pointer-events: none) for free users
- Stat cards: Decisions This Month (24, +8), Avg Quality Score (74/100 with progress bar), Outcomes Tagged (68%), Top Decision Maker (avatar + name)
- Quality Distribution: vertical bar chart with 3 bars (0-39 red, 40-69 amber, 70-100 emerald)
**Rationale**: Paywall blur creates desire for analytics; stats chosen to drive behavior (tagging outcomes, improving quality)

### Decision List
**Purpose**: Core content — browsable decision records
**Layout**: Vertical stack of card rows (space-y-2), each with orange left border
**Key elements**:
- Status icon: green checkmark circle (Decided) or amber clock circle (Open)
- Title (font-semibold, truncate) + resolution preview (text-slate-500, truncate)
- Meta row: author avatar + name, date, workflow badge
- Right side: quality score circle (colored bg) + outcome pill badge
**Rationale**: Horizontal card layout maximizes information density while maintaining scanability; left border accent is a subtle Decision DNA brand element

### Pagination
**Purpose**: Navigate through decision pages
**Layout**: Flex row, justify-between, with border-top separator
**Key elements**:
- "Showing 1-8 of 47 decisions" label
- Page buttons: Prev (disabled on page 1), numbered pages (1-3, ellipsis, 6), Next
**Rationale**: Standard pagination pattern; disabled prev on first page prevents confusion

### Log Decision Modal
**Purpose**: Create new decision records
**Layout**: Centered modal (max-w-lg) with backdrop blur overlay
**Key elements**:
- Header: "Log a Decision" title + close button
- Form fields: Question (required, textarea), Resolution (textarea), Rationale (textarea), Options Considered (tag input with Enter), Decision Type (select), Tags (multi-select)
- Footer: Quality Score display (animated, hidden until submit) + Cancel/Log Decision buttons
**Rationale**: Progressive disclosure — only Question is required; quality score animation provides positive feedback on submission

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | 8 decision rows, page 1 selected, health card blurred | Primary landing state |
| **Filtered** | Decision list re-renders in real-time as filters change | Client-side filtering in mockup |
| **Empty search** | Centered empty state: bulb icon + "No decisions match" | Includes suggestion to clear filters |
| **Modal open** | Backdrop blur, body scroll locked, focus trapped | Escape/backdrop click to close |
| **Modal validation** | Red border flash on Question field if empty on submit | 2s timeout to remove red border |
| **Modal success** | Quality score appears with scale pulse animation, modal auto-closes after 1.5s | Score is random 65-95 in mockup |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Sidebar hidden, header row stacks vertically, filter selects stack, decision meta simplified |
| **Tablet** (640-1024px) | Sidebar hidden, health card grid goes 2-col, filters wrap |
| **Desktop** (> 1024px) | Full layout: fixed sidebar (w-60), main content offset (lg:ml-60), 4-col health stats, single-row filters |

---

## Cognitive Load Assessment
- **Information density**: Medium-high — each decision row shows 7 data points (status, title, resolution, author, date, workflow, quality, outcome) but truncation and visual hierarchy keep it scannable
- **Visual hierarchy**: Strong — quality score circles and outcome badges create clear visual anchors; orange left border guides the eye down the list
- **Progressive disclosure**: Well-layered — health card is collapsed/blurred for free users; modal reveals full form only on action; resolution text truncated
- **Interaction complexity**: Low — search and filter are standard patterns; modal form is straightforward with minimal required fields

---

## Accessibility Notes
- **Contrast**: Focus-visible outlines use 2px solid #4F6EF7 with 2px offset; text on dark backgrounds maintains AA contrast
- **Focus order**: Header nav > sidebar nav > search > filters > decision rows (tabbable) > pagination > Log Decision button
- **Screen reader**: Decision rows use role="button" with aria-label="Decision: [title]"; modal uses role="dialog", aria-modal="true", aria-labelledby; pagination uses nav with aria-label="Pagination"; health chart bars have role="img" with aria-label
- **Keyboard**: Escape closes modal; Tab cycles through modal elements with focus trap; decision rows are focusable via tabindex="0"

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Orange left border on decision rows | Decision DNA brand accent — differentiates from other list views | Yes — add as Decision DNA pattern |
| Score pulse keyframe animation | Unique micro-interaction for quality score reveal | No — feature-specific animation |
| Business plan blur overlay | Paywall-specific pattern | Yes — add as gated content pattern |
