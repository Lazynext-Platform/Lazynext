# Design Spec — Canvas Context Menu & Controls

> **Feature**: 33 — Canvas Context Menu & Controls
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: Two right-click context menus (canvas-level and node-level), zoom controls with percentage display, and a collapsible minimap with viewport indicator — all overlaid on the canvas.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Separate menus for canvas vs node right-click; zoom controls as vertical stack (not horizontal) to save horizontal space; minimap includes edge representations for orientation; delete action uses red for severity.

---

## Section Breakdown

### Canvas Context Menu
**Purpose**: Quick actions on empty canvas space
**Layout**: w-52 bg-slate-900 border border-slate-700 rounded-xl, positioned at cursor
**Key elements**: "Create Node" section header, 4 node type buttons (Task/Doc/Decision/Thread) with colored dots and keyboard shortcuts, divider, Paste (⌘V), Fit to view (⌘1), Export as PNG
**Rationale**: Most common canvas action is creating nodes — given prominence at top.

### Node Context Menu
**Purpose**: Actions on a specific node
**Layout**: w-52 bg-slate-900 border border-slate-700 rounded-xl, positioned at cursor
**Key elements**: "Node Actions" header, Edit (Enter), Duplicate (⌘D), Connect to…, Change type, divider, Copy link, Delete (red, ⌫)
**Rationale**: Progressive severity — edit actions at top, destructive delete at bottom.

### Zoom Controls
**Purpose**: Navigate canvas zoom level
**Layout**: Fixed bottom-6 right-6, bg-slate-900 rounded-xl vertical stack
**Key elements**: Zoom in (+), percentage display (100%), zoom out (−), fit-to-view button, lock canvas button
**Rationale**: Vertical stack mirrors common canvas tool patterns. Percentage gives precise feedback.

### Minimap
**Purpose**: Overview of full canvas for spatial orientation
**Layout**: Fixed bottom-6 left-6, w-48 h-32 bg-slate-900/90 backdrop-blur-sm rounded-xl
**Key elements**: Header with "Minimap" label and collapse toggle, mini node blocks (colored by type), mini edges, viewport rectangle (border-[#4F6EF7]/50)
**Rationale**: Minimap is essential for large canvases. Viewport indicator shows current visible area.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Canvas right-click** | Menu appears at cursor, scale-in animation | Closes on click outside |
| **Node right-click** | Node menu at cursor | Contextual to clicked node |
| **Zoom in/out** | Percentage updates (25%–200%) | 10% increments |
| **Minimap expanded** | Shows nodes, edges, viewport | Default state |
| **Minimap collapsed** | Only header bar visible | Toggle via chevron |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Long-press for menus, minimap hidden, pinch-to-zoom |
| **Tablet (640–1024px)** | Context menus + zoom controls, minimap optional |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Accessibility Notes

- **Contrast**: White text on slate-900 meets AA. Red delete text on dark background meets AA.
- **Focus order**: Menu items top-to-bottom, focusable on open.
- **Screen reader**: Menus need role="menu". Zoom buttons need aria-labels. Minimap needs aria-label.
- **Keyboard**: Context menu via Shift+F10 or dedicated key. Arrow keys within menu. Esc to close.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Context menu component | New pattern not in existing system | Consider adding to design system |
