# 🪞 Review — Workflow Canvas

> **Feature**: #05 — Workflow Canvas
> **Branch**: `feature/05-workflow-canvas`
> **Merged**: 2026-04 → `main`

## Result

**Status**: ✅ Shipped — the spatial canvas is the primary working surface of Lazynext.

**Summary**: Three-column app shell (collapsible sidebar, ReactFlow canvas, collapsible detail panel) with 7 typed node types, edge connections, pan/zoom, and selection. State managed by Zustand (`canvas.store` + `ui.store`). Decision DNA panel and thread panel hookups live alongside this build (extended in #07, #09, #11).

## What Went Well ✅

- **ReactFlow was the right call** — Pan/zoom/drag, edge handles, minimap, and SSR-safe dynamic import all came for free. Custom node types via the `nodeTypes` map kept our visual identity intact.
- **Zustand split into `canvas.store` and `ui.store`** — Clear boundary: canvas owns nodes/edges/selection/history; UI owns sidebar/panel/modal state. Made later features (#11, #27, #33) trivially additive.
- **Mobile fork via `NodeListView`** — Recognizing early that ReactFlow doesn't render below 640px and forking to #06 was the right architectural call; trying to make ReactFlow responsive would have been a multi-week sink.

## What Went Wrong ❌

- **Initial demo data was hardcoded** — Default nodes/edges shipped baked in to show the product on first load; replaced with real Supabase data and honest empty states (#20) during the v1.3.2.0 → v1.3.3.6 eradication push.
- **Undo/redo was retrofitted** — Not in the original architecture; added to `canvas.store` later. Should have been a day-1 concern.
- **History performance** — Storing entire node/edge snapshots per change ballooned memory in long sessions; switched to action-based history with undo functions per command.

## What Was Learned 📚

- The canvas's data model and state shape is the platform's spine — every later feature reads or writes to it. Get it right early; later refactors are expensive.
- ReactFlow's plugin points (custom nodes, edge types, controls, panels) handle ~95% of canvas needs without modification.
- Demo data is technical debt. Build with real data + honest empty states from the first day.

## What To Do Differently Next Time 🔄

- Treat "what does the empty workspace look like" as a day-1 task, not a polish-pass concern.
- Plan undo/redo into the store API at architecture time.
- Throttle/batch high-frequency canvas mutations (drag) at the store layer, not at the UI layer.

## Metrics

| Metric | Value |
|---|---|
| Node primitives shipped | 7 (TASK, DOC, DECISION, THREAD, PULSE, AUTOMATION, TABLE — last via #25) |
| Stores added | 2 (`canvas.store`, `ui.store`) |
| Downstream features unblocked | 30+ |

## Follow-ups

- [x] Real-data wiring (v1.3.2.0+ eradication push)
- [x] Action-based history for undo/redo
- [x] Mobile fork to NodeListView (#06)
- [ ] Workspace search index for fast cross-workspace canvas search — backlog
- [ ] CRDT for collaborative text editing on the same field — Phase 4 (deferred from #27)
