# Design Brief — Canvas Context Menu & Controls

> **Feature**: 33 — Canvas Context Menu & Controls
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Right-click context menus for canvas (create node, paste, fit-to-view, export PNG) and node (edit, duplicate, connect, change type, copy link, delete), plus zoom controls (±, percentage, fit, lock) and a minimap with viewport indicator.
**Why**: Canvas interactions need spatial context menus and navigation controls for efficient workflow editing.
**Where**: Canvas view — context menus appear on right-click; zoom controls bottom-right; minimap bottom-left.

---

## Target Users
- **All canvas users**: Need context menus for quick node creation and management
- **Power users**: Zoom controls and minimap for navigating large workflows

---

## Requirements

### Must Have
- [x] Canvas right-click menu: Create node (Task/Doc/Decision/Thread with shortcuts), Paste, Fit to view, Export PNG
- [x] Node right-click menu: Edit, Duplicate, Connect to…, Change type, Copy link, Delete (red)
- [x] Zoom controls: +/- buttons, percentage display, fit-to-view button, lock canvas button
- [x] Minimap: viewport indicator, mini node representations, toggle collapse

### Nice to Have
- [x] Keyboard shortcuts shown in menus
- [x] Node-type colored dots in create submenu
- [x] Minimap shows edges between mini nodes
- [x] Scale-in animation on menu open

### Out of Scope
- Drag-to-select rectangle
- Multi-node context menu
- Edge context menu

---

## Layout

**Page type**: Canvas overlays
**Primary layout**: Full-screen canvas with overlaid controls
**Key sections**:
1. **Canvas context menu**: w-52, appears at right-click position
2. **Node context menu**: w-52, appears at right-click on node
3. **Zoom controls**: Fixed bottom-8 right-6, vertical button stack
4. **Minimap**: Fixed bottom-6 left-6, w-48 h-32

---

## Responsive Behavior
- **Mobile**: Long-press replaces right-click; minimap hidden; zoom via pinch
- **Tablet**: Context menus work; minimap shown
- **Desktop**: Full context menus, zoom controls, minimap

---

## Constraints
- Context menus must not overflow viewport
- Minimap viewport indicator must accurately reflect visible area
- Delete action requires visual severity (red text)

---

## References
- Feature 05 (Workflow Canvas) — parent canvas context
- Feature 29 (Node Creation Menu) — FAB-based creation (complementary)
- Feature 24 (Keyboard Shortcuts) — shortcut labels in menus
