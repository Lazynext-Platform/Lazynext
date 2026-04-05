# Design Spec — Node Creation Menu

> **Feature**: 29 — Node Creation Menu
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A floating action button with popup grid menu showing 6 active node types + 1 disabled (TABLE), keyboard shortcut labels, hover color states, and a dashed placement ghost preview.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: 2-column grid over radial/list for balanced density; type-colored hover borders reinforce the visual language; TABLE shown but disabled to tease Phase 3; placement ghost uses brand blue (not type color) to signal "pending placement."

---

## Section Breakdown

### FAB Button
**Purpose**: Primary trigger for node creation
**Layout**: Fixed bottom-8 right-8, w-14 h-14 rounded-2xl
**Key elements**: bg-[#4F6EF7] with white plus SVG, shadow-xl shadow-blue-500/20, pulse animation (fabPulse keyframes)
**Rationale**: Large, blue, and pulsing — impossible to miss. Rounded-2xl distinguishes from circular buttons.

### Node Type Grid
**Purpose**: Select which type of node to create
**Layout**: w-72 bg-slate-900 rounded-2xl, 2-column grid with gap-2, p-4
**Key elements**: 6 type buttons (bg-slate-800 rounded-xl p-3), each with icon (w-10 h-10 colored bg), name (text-sm font-medium), shortcut (text-[10px] text-slate-500)
**Rationale**: Grid is compact and scannable. Icons provide instant type recognition. Shortcuts educate power users.

### TABLE Placeholder
**Purpose**: Tease upcoming Phase 3 feature
**Layout**: Full-width row, dashed border, opacity-60, cursor-not-allowed
**Key elements**: Teal icon (muted), "Table" name, "Coming in Phase 3" subtitle, "Soon" badge (teal)
**Rationale**: Showing disabled TABLE builds anticipation without confusing users who might try to use it.

### Placement Ghost
**Purpose**: Show where the new node will be placed
**Layout**: Absolute on canvas, dashed border-2 border-[#4F6EF7], bg-[#4F6EF7]/5
**Key elements**: "Click to place [Type]" label, "Click anywhere on canvas" instruction below
**Rationale**: Ghost provides spatial feedback before committing placement.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **FAB idle** | Pulse animation, plus icon | Default canvas state |
| **Menu open** | FAB rotates to X (45deg), menu appears | Scale-in animation |
| **Type hover** | Border changes to type color, bg tints to type/5 | Per-type colors |
| **Type selected** | Menu closes, ghost appears | FAB returns to pulse |
| **TABLE hover** | No change — cursor-not-allowed | Disabled state |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | FAB present, menu may become bottom sheet |
| **Tablet (640–1024px)** | Standard layout |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Cognitive Load Assessment

- **Information density**: Low — 7 options in a clean grid
- **Visual hierarchy**: Clear — icons are largest elements, names secondary, shortcuts tertiary
- **Progressive disclosure**: FAB → menu → placement is a natural 3-step flow
- **Interaction complexity**: Low — click FAB, click type, click canvas

---

## Accessibility Notes

- **Contrast**: White text on slate-800 backgrounds meets AA. Type-colored icons provide additional meaning.
- **Focus order**: FAB → menu items left-to-right, top-to-bottom → close
- **Screen reader**: FAB needs aria-label "Add node". Each type button needs descriptive label. TABLE needs aria-disabled.
- **Keyboard**: N to open menu, type letter shortcuts for direct creation, Esc to close.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| FAB pattern (rounded-2xl, fixed position) | New component not in existing patterns | Consider adding FAB to design system |
