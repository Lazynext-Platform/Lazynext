# Design Brief — Keyboard Shortcuts

> **Feature**: 24 — Keyboard Shortcuts
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A keyboard shortcuts help overlay modal triggered by the ? key, displaying all available shortcuts organized by category.
**Why**: Power users need quick reference for shortcuts without leaving the app; discoverability drives adoption of keyboard-driven workflows.
**Where**: Global modal overlay, accessible from any view via ? key.

---

## Target Users

- **Power users**: Need quick reference while learning shortcuts
- **New users**: Discovering available keyboard interactions
- **Desktop users**: Keyboard shortcuts are desktop-only

---

## Requirements

### Must Have
- [x] Modal overlay with backdrop blur (bg-black/60)
- [x] 4 shortcut categories: Navigation (6 shortcuts), Canvas (10), Editing (5), LazyMind AI (2)
- [x] Styled kbd elements with min-width, rounded borders, bg-slate-800
- [x] Support for combo keys (⌘+K), sequence keys ("G then D"), and single keys (N)
- [x] Node-type-colored keys for add-node shortcuts (blue Task, emerald Doc, orange Decision)
- [x] Footer note: "Use Ctrl on Windows/Linux"
- [x] Close button and "Press ? to toggle" hint

### Nice to Have
- [x] Scale-in entrance animation
- [x] Scrollable content area (max-h-[60vh])
- [x] LazyMind section with blue header accent

### Out of Scope
- Custom shortcut binding
- Shortcut search/filter
- Context-sensitive shortcuts (showing only relevant ones)

---

## Layout

**Page type**: Modal overlay (max-w-2xl centered)
**Primary layout**: Vertical sections with shortcut rows
**Key sections** (in order):
1. **Header**: Icon, title, "? to toggle" hint
2. **Navigation shortcuts**: 6 items (⌘K, ⌘⇧F, ⌘\, G then D/P/S)
3. **Canvas shortcuts**: 10 items (N, N+T/D/Q, ⌘A, ⌫, ⌘D, ⌘1, ⌘Z, ⌘⇧Z)
4. **Editing shortcuts**: 5 items (Enter, Esc, ⌘B, /, @)
5. **LazyMind AI shortcuts**: 2 items (⌘J, ⌘⇧W)
6. **Footer**: Windows/Linux note + Close button

---

## States & Interactions

| State | Description |
|---|---|
| **Hidden** | Modal not visible |
| **Visible** | Modal shown with backdrop, scrollable content |

**Key interactions**:
- Press ? to toggle modal visibility
- Click Close button or backdrop to dismiss
- Scroll within content area for long lists

---

## Responsive Behavior

- **Mobile**: Not shown (shortcuts are desktop-only)
- **Tablet**: May show with adjusted width
- **Desktop**: Full modal at max-w-2xl centered

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Shortcut labels** | Static | "Open command palette", "Add Task node", "Zoom to fit" |
| **Key combinations** | Static | ⌘K, ⌘⇧F, G then D, N then T |
| **Category headers** | Static | Navigation, Canvas, Editing, LazyMind AI |

---

## Constraints

- Mac symbols (⌘, ⇧, ⌫) used by default with Ctrl note for Windows
- Node-type-colored kbd backgrounds only for add-node shortcuts
- Modal must not interfere with text input focus

---

## References

- VS Code, Linear, and Figma keyboard shortcut overlays for pattern reference
- Design system: modal pattern, dark theme tokens
