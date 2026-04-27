# 📋 Summary — Node Creation Menu

> **Feature**: #29 — Node Creation Menu
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A floating action button (FAB) anchored to the bottom-right of the canvas that opens a 2-column node-type picker. Lists 7 primitives — Task `T`, Doc `D`, Decision `Q` (legacy), Thread `H`, Pulse `P`, Automation `A`, Table — with type-colored icons, names, and keyboard shortcut badges. Shipped as 7-of-7 (Table moved out of "Coming in Phase 3" once #25 shipped). Selecting a type spawns a placement ghost that follows the cursor; clicking commits the new node at that position.

## Key Decisions

- **FAB + radial menu over right-click only** — Discoverable for new users; right-click context menu (#33) covers power-user flow.
- **Type shortcuts are global** — `T`, `D`, `Q`, `H`, `P`, `A` work from anywhere on the canvas (not just inside the menu). Listed in #24 Keyboard Shortcuts.
- **Placement ghost is canonical** — All node-creation paths (FAB, shortcut, right-click, drag from edge handle) share the same ghost component for visual consistency.
- **`+` icon rotates to `×`** — Single FAB toggles between collapsed and expanded states; doesn't require a separate close button.

## Files & Components Affected

- `components/canvas/NodeCreationFAB.tsx` — FAB + radial menu
- `components/canvas/PlacementGhost.tsx` — Shared placement preview
- `lib/canvas/node-defaults.ts` — Per-type default `data` payload
- `stores/canvas.store.ts` — `creatingNodeType` state

## Dependencies

- **Depends on**: #05 Workflow Canvas, #24 Keyboard Shortcuts (registers the type keys)
- **Enables**: Every node-creation user journey

## Notes

- The "Drag from a node handle to create an edge" hint in the footer matches how ReactFlow exposes edge creation; reduces the discovery gap.
- TABLE was promoted from "Soon" badge to active when #25 shipped.
