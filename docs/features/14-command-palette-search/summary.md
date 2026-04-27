# 📋 Summary — Command Palette & Search

> **Feature**: #14 — Command Palette & Search
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A `⌘K` command palette overlay that exposes Quick Actions (Create Task `T`, Create Doc `D`, Log Decision `X`, Open LazyMind `⌘L`), a Recent items section (last 5 nodes touched), and Navigation shortcuts (Decision DNA, Settings, Templates). The same overlay degrades into a global search experience as the user types — searching real nodes by title across the workspace, with type icons, status, and recency in each result.

## Key Decisions

- **One overlay, two modes** — Empty input shows action grid; typing turns it into search. Avoids two separately-discoverable shortcuts and matches the muscle memory power users already have from VS Code, Linear, Raycast.
- **Keyboard hints on every row** — Each action shows its standalone shortcut (`T`, `D`, `X`, `⌘L`); after one use, users learn it and never reopen the palette for that action.
- **Recent items are local-first** — Driven by an in-store list (`canvas.store.recents`) so the palette feels instant; reconciles with server on open.
- **Backend search is `ilike` for v1.0** — Postgres trigram + full-text is a follow-up; current scale doesn't justify the index cost.

## Files & Components Affected

- `components/ui/CommandPalette.tsx` — Overlay shell + result rendering
- `lib/canvas/commands.ts` — Action registry consumed by the palette
- `app/api/v1/search/route.ts` — Workspace-scoped node search
- `stores/ui.store.ts` — Open/close + query state
- `stores/canvas.store.ts` — Recent items list

## Dependencies

- **Depends on**: #05 Workflow Canvas, #24 Keyboard Shortcuts (for the global `⌘K` listener)
- **Enables**: Faster access to every other feature; reduces nav-drill friction

## Notes

- Action shortcuts (`T`, `D`, `X`) are also bound globally outside the palette via #24.
- Semantic / vector search is intentionally deferred — would require an embedding pipeline that doesn't justify itself before product-market fit.
