# Design Spec — Keyboard Shortcuts

> **Feature**: 24 — Keyboard Shortcuts
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A modal overlay displaying 23 keyboard shortcuts across 4 categories with styled kbd elements, node-type coloring, and sequence key support.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Grouped by context (Navigation/Canvas/Editing/AI) over alphabetical; node-type colors on add-node shortcuts to reinforce the 7-primitive visual language; "G then D" sequence notation for two-step shortcuts.

---

## Section Breakdown

### Navigation Section (6 shortcuts)
**Purpose**: App-level navigation shortcuts
**Key elements**: ⌘K (command palette), ⌘⇧F (global search), ⌘\ (sidebar toggle), G→D (decisions), G→P (pulse), G→S (settings)
**Rationale**: "G then" pattern borrowed from GitHub/Gmail for memorable section navigation.

### Canvas Section (10 shortcuts)
**Purpose**: Node and canvas manipulation
**Key elements**: N (add node), N→T/D/Q (typed nodes with colored keys), ⌘A (select all), ⌫ (delete), ⌘D (duplicate), ⌘1 (zoom fit), ⌘Z/⌘⇧Z (undo/redo)
**Rationale**: Single-key N opens menu; two-key sequences create specific types. Color-coded keys (blue/emerald/orange) reinforce the visual language from the canvas.

### Editing Section (5 shortcuts)
**Purpose**: Node detail panel and editor shortcuts
**Key elements**: Enter (open panel), Esc (close/cancel), ⌘B (bold), / (slash command), @ (mention)
**Rationale**: Standard text editing conventions plus Tiptap-specific triggers.

### LazyMind AI Section (2 shortcuts)
**Purpose**: AI assistant quick access
**Key elements**: ⌘J (open LazyMind), ⌘⇧W (weekly digest)
**Rationale**: Separate section with blue header accent to highlight AI as a distinct capability.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Hidden** | No modal visible | Default state |
| **Visible** | Modal with backdrop, scale-in animation | Triggered by ? key |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Modal hidden — shortcuts not applicable on mobile |
| **Tablet (640–1024px)** | Reduced width, may need more scrolling |
| **Desktop (> 1024px)** | max-w-2xl centered modal, max-h-[60vh] scrollable |

---

## Cognitive Load Assessment

- **Information density**: High — 23 shortcuts in one view, but grouped by context reduces scanning effort
- **Visual hierarchy**: Clear — category headers break up the list; colored keys draw attention to node shortcuts
- **Progressive disclosure**: None needed — this is a reference overlay, not a workflow
- **Interaction complexity**: Minimal — view only with scroll

---

## Accessibility Notes

- **Contrast**: kbd elements use slate-300 text on slate-800 background with slate-600 borders — meets AA.
- **Focus order**: Close button should be focusable; content is read-only reference.
- **Screen reader**: Each shortcut row should have descriptive text. kbd elements need aria-label.
- **Keyboard**: ? to open, Esc to close. Content is non-interactive.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Node-type colored kbd backgrounds | Domain-specific visual reinforcement for add-node shortcuts | No — specific to this feature |
