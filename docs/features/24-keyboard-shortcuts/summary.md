# 📋 Summary — Keyboard Shortcuts

> **Feature**: #24 — Keyboard Shortcuts
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A `?` keystroke globally toggles a help modal listing 23 keyboard shortcuts in 4 categories: **Navigation** (6, e.g. `G then D` → Decisions), **Canvas** (10, e.g. `N` to add node, `T/D/X` for type-specific create), **Editing** (5), **LazyMind AI** (2, including `⌘L`). Combo, sequence, and single-key shortcuts are rendered with styled `kbd` elements; add-node keys are colored by node type. A footer hint reminds Windows/Linux users to use `Ctrl`.

## Key Decisions

- **Single global registry** — All shortcuts live in `lib/canvas/shortcuts.ts` and are bound by one `useKeyboardShortcuts()` hook at the app root. Avoids scattered `addEventListener` and stale handlers.
- **Help modal renders from the same registry** — One source of truth — no risk of the help text drifting from the actual bound key.
- **Sequence shortcuts via timeout buffer** — `G then D` is implemented with a 1.2s buffer for the second key.
- **Desktop only** — Mobile sees the bottom nav and FAB; the help modal isn't even reachable on touch devices.

## Files & Components Affected

- `lib/canvas/shortcuts.ts` — Shortcut registry
- `hooks/useKeyboardShortcuts.ts` — Global key handler
- `components/canvas/KeyboardShortcutsModal.tsx` — Help overlay
- Various feature components — register their shortcuts in the registry

## Dependencies

- **Depends on**: #05 Workflow Canvas, #14 Command Palette (shares some keys), #29 Node Creation Menu (`N` and type keys)
- **Enables**: Keyboard-first power-user workflows across the app

## Notes

- Inputs and contenteditable elements suppress global shortcuts (`event.target` check).
- macOS `⌘` ↔ Windows/Linux `Ctrl` handled by a `mod` key abstraction.
