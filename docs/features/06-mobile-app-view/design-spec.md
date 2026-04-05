# Design Spec — Mobile App View

> **Feature**: 06 — Mobile App View
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A mobile-first NodeListView that replaces the desktop canvas with a vertically scrollable card list, filter pills, hamburger navigation, and bottom tab bar — all within a 390px viewport.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Cards use left-border color coding (not full background) to indicate node type while keeping information scannable; hamburger menu instead of persistent sidebar to maximize content area; bottom tab bar for primary navigation rather than top tabs.

---

## Section Breakdown

### Status Bar / Top Bar

**Purpose**: Provide workspace context and primary actions in a compact header
**Layout**: Sticky h-12 bar with hamburger left, centered workflow title, avatar + add button right
**Key elements**:
- Hamburger icon (w-6 h-6, slate-300) — toggles slide-out menu
- Workflow name ("Q2 Product Sprint") — semibold text-sm, truncated with mx-2
- User avatar (w-8 h-8 rounded-full) — gradient background with initials
- Add button (w-8 h-8 rounded-full bg-blue-600) — plus icon

**Rationale**: Follows mobile conventions with hamburger for secondary nav and prominent add action. Avatar serves double duty as profile access point.

### Filter Pills Bar

**Purpose**: Let users quickly narrow the node list by type
**Layout**: Sticky bar (h-10) below top bar with horizontal scroll, sort button right-aligned
**Key elements**:
- 5 filter pills: All (slate-700 active state), Tasks (blue-500/15), Docs (emerald-500/15), Decisions (orange-500/15), Threads (purple-500/15)
- Sort button (w-10) with horizontal lines icon
- `no-scrollbar` CSS class hides scrollbar while allowing swipe

**Rationale**: Node-type colors on pills create visual consistency with cards below. Horizontal scroll handles variable number of types without wrapping.

### Node Card List

**Purpose**: Primary content area — browse all workflow nodes
**Layout**: Single column, 2.5px gap between cards, padding-bottom for bottom nav clearance (pb-24)
**Key elements**:
- Card: bg-slate-800 rounded-xl, border-l-4 with type color, p-3
- Type label: 10px uppercase with matching color icon
- Title: text-sm font-semibold, truncated to one line
- Metadata row: assignee avatar (w-5 h-5), due date, priority dot, status badge
- Decision cards: quality score badge (green for ≥80, amber for <80) + status
- Doc cards: word count + last updated time
- Chevron: slate-600 right arrow indicating navigability

**Rationale**: Left border color is the fastest visual scanner for type differentiation. Compact card design fits 4-5 cards in viewport for efficient scrolling.

### Bottom Navigation

**Purpose**: Primary app-level navigation between major sections
**Layout**: Fixed h-16 bar at bottom, 4 equal-width tabs, pb-1 for safe area
**Key elements**:
- Home tab (blue-400 when active, slate-500 inactive) — grid icon
- Decisions tab — checkmark circle icon
- Threads tab — chat bubble icon
- Pulse tab — bar chart icon
- Each tab: flex-col with w-6 h-6 icon + 10px label

**Rationale**: Bottom tabs follow iOS/Android mobile conventions. 4 tabs keeps each target large enough for comfortable touch. Pulse replaces AI panel as a bottom tab since it's a frequent check-in view.

### Hamburger Menu Overlay

**Purpose**: Secondary navigation for workflows, settings, and account
**Layout**: Fixed w-72 sidebar sliding from left with bg-black/60 backdrop
**Key elements**:
- Workspace header: logo (w-10 h-10 gradient), name, plan label
- Workflows list: 3 items with link icon, active state (bg-slate-800)
- Settings link with gear icon
- Sign out link (text-red-400)
- CSS transform translateX(-100%) → translateX(0) for slide animation

**Rationale**: Hamburger pattern keeps main viewport uncluttered. Workflow switching is secondary to node browsing on mobile, so it belongs in the menu rather than taking up screen real estate.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | All 8 cards shown, "All" pill active (bg-slate-700) | Home tab highlighted in blue |
| **Filtered by type** | Only matching cards visible, selected pill highlighted | JS toggles card display based on data-type attribute |
| **Menu open** | Sidebar slides in, backdrop fades to 60% black | Body scroll not explicitly locked |
| **Swipe hint** | "Swipe cards to see more actions" text visible below cards | Fades to opacity 0 after 4 seconds via setTimeout |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | This view — NodeListView with bottom nav, no canvas |
| **Tablet (640–1024px)** | Transitions to tablet layout; not covered by this mockup |
| **Desktop (> 1024px)** | Full canvas view (Feature 05); this view not shown |

---

## Cognitive Load Assessment

- **Information density**: Medium — each card shows 3-4 data points (type, title, metadata), manageable for scanning
- **Visual hierarchy**: Clear — type color border → title → metadata flows top-to-bottom within each card
- **Progressive disclosure**: Card list is the first level; tapping a card would reveal full node detail (Feature 09)
- **Interaction complexity**: Low — filter, scroll, tap card, hamburger menu; all single-tap actions

---

## Accessibility Notes

- **Contrast**: White text on slate-800 cards meets AA contrast. Type labels use saturated colors (blue-400, emerald-400, orange-400) on dark backgrounds.
- **Focus order**: Hamburger → filter pills left-to-right → node cards top-to-bottom → bottom nav tabs left-to-right
- **Screen reader**: Node type label provides context before title. Status badges should have aria-label for screen readers.
- **Keyboard**: Not primary concern for mobile view, but hamburger and cards should be focusable for assistive devices

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Fixed 390px max-width on body | Mobile mockup targets iPhone viewport specifically | No — production would use responsive breakpoints |
| user-scalable=no on viewport | Prevents zoom on mobile mockup for native feel | No — production should allow zoom for accessibility |
