# 📋 Summary — Canvas Context Menu & Controls

> **Feature**: #33 — Canvas Context Menu & Controls
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

Right-click context menus and on-canvas controls. **Canvas right-click menu**: Create node submenu (Task/Doc/Decision/Thread with shortcuts), Paste, Fit to view, Export PNG. **Node right-click menu**: Edit, Duplicate, Connect to…, Change type, Copy link, Delete (red). **Zoom controls**: +/- buttons, percentage display, fit-to-view, lock canvas — anchored bottom-right. **Minimap**: viewport indicator + mini node representations + edges + collapse toggle, anchored bottom-left.

## Key Decisions

- **Two menus, one component** — `<ContextMenu>` accepts a `target` (`canvas` or `node`) and renders the matching item set. Avoids duplicate menu chrome.
- **`Connect to…` opens an inline picker** — Click target node, edge is created. No separate connect mode.
- **Export PNG runs in the browser** — Uses `html-to-image` against the ReactFlow viewport; no server roundtrip.
- **Minimap is collapsible by default closed below 1280px** — Saves screen real estate on smaller laptops.
- **Lock canvas freezes pan/zoom** — Useful when presenting; doesn't affect node interaction.

## Files & Components Affected

- `components/canvas/ContextMenu.tsx`
- `components/canvas/CanvasControls.tsx` — Zoom + lock + fit
- `components/canvas/CanvasMinimap.tsx`
- `lib/canvas/export-png.ts` — html-to-image wrapper
- `stores/canvas.store.ts` — `locked` state

## Dependencies

- **Depends on**: #05 Workflow Canvas, #29 Node Creation Menu (shares creation flow), #24 Keyboard Shortcuts (menu items show shortcuts)
- **Enables**: Power-user discovery and faster canvas operations

## Notes

- "Copy link" generates a URL with `?node=<id>` that scrolls + selects the node on load.
- The minimap subscribes to ReactFlow's viewport and node store; zero per-frame manual rendering.
