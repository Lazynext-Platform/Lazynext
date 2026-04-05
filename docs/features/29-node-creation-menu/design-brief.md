# Design Brief — Node Creation Menu

> **Feature**: 29 — Node Creation Menu
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A floating action button (FAB) with a radial node-type selection menu for creating new nodes on the canvas, showing all 7 primitive types with keyboard shortcuts and a placement ghost.
**Why**: Users need a clear, discoverable way to add new nodes to their canvas with type selection and visual placement feedback.
**Where**: Bottom-right corner of the canvas view, triggered by FAB click or N key.

---

## Target Users
- **All workspace users**: Need to create new nodes on the canvas
- **Power users**: Use keyboard shortcuts (N then T/D/Q) for fast node creation

---

## Requirements

### Must Have
- [x] FAB (w-14 h-14, bg-[#4F6EF7], rounded-2xl) in bottom-right with plus icon
- [x] 2-column grid menu (w-72) with 6 node types: Task (blue), Doc (emerald), Decision (orange), Thread (purple), PULSE (cyan), Automation (amber)
- [x] Each type: colored icon (w-10 h-10 rounded-lg), name, keyboard shortcut
- [x] TABLE shown as disabled "Coming in Phase 3" with "Soon" badge
- [x] Placement ghost (dashed border) after type selection
- [x] FAB rotates plus icon to X (45deg) when menu is open
- [x] "Drag from a node handle to create an edge" hint in footer
- [x] "Add Node" header with N keyboard shortcut badge

### Nice to Have
- [x] FAB pulse animation when closed (shadow-blue glow)
- [x] Scale-in animation on menu open
- [x] Hover states with type-colored borders on menu items
- [x] Click outside to close menu

### Out of Scope
- Node template selection within type
- Drag-to-place interaction (only click-to-place ghost shown)
- Edge creation UI (mentioned in hint only)

---

## Layout

**Page type**: Canvas overlay (FAB + popup menu)
**Primary layout**: FAB bottom-right, menu above FAB (bottom-28 right-8)
**Key sections**:
1. **FAB**: Plus icon, blue background, pulse animation
2. **Menu header**: "Add Node" + N shortcut badge
3. **Node type grid**: 2x3 grid of type buttons
4. **TABLE placeholder**: Full-width disabled row
5. **Edge hint**: Info text at bottom
6. **Placement ghost**: Dashed border preview on canvas

---

## States & Interactions

| State | Description |
|---|---|
| **FAB closed** | Plus icon with pulse animation |
| **Menu open** | FAB shows X, menu visible with scale-in |
| **Type hovered** | Border changes to type color, bg tints |
| **Type selected** | Menu closes, placement ghost appears on canvas |
| **Placing** | Ghost visible with "Click to place [Type]" text |

**Key interactions**:
- Click FAB to toggle menu
- Click node type to select and show placement ghost
- Press N key to open menu (equivalent to FAB click)
- Press N then T/D/Q/H/P/A for direct type creation
- Click outside to close menu

---

## Responsive Behavior

- **Mobile**: FAB visible but opens simplified type list (no 2-col grid)
- **Tablet**: Standard FAB + menu
- **Desktop**: Full FAB + grid menu + placement ghost

---

## Constraints

- TABLE is disabled/grayed out until Phase 3
- Node type colors must match the design system palette
- FAB must not overlap with zoom controls or minimap
- Placement ghost uses brand blue dashed border, not type color

---

## References

- Feature 05 (Workflow Canvas) — canvas context where this appears
- Feature 24 (Keyboard Shortcuts) — shortcut documentation
- Google Material Design FAB pattern for interaction model
