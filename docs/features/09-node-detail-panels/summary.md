# 📋 Summary — Node Detail Panels

> **Feature**: #09 — Node Detail Panels
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The right-side editing panels for the three core node primitives — Task, Doc, and Decision — all sharing a consistent shell (header, tabs, close, delete) but with primitive-specific bodies. Tasks get status/priority/assignee/due-date/subtasks/tags. Docs get a Tiptap-style rich-text editor with slash commands, inline node-mentions, and a floating toolbar. Decisions get question/resolution/rationale, Options Considered with chosen indicator, decision type, computed quality score, outcome dropdown, made-by metadata, and a collapsible thread (which expands into #11).

## Key Decisions

- **One shell, three bodies** — A `NodePanel` shell handles open/close, scroll, header, and delete; primitive-specific components plug in as the body. Avoids three separately-evolved panels that drift.
- **Tiptap for the doc editor** — Mature, extensible, supports custom marks for node-mention pills. Slash commands are a Tiptap suggestion extension.
- **Inline node-mentions are real references** — `@Ship onboarding v2` is a `node_id` reference, not free text — clicking it navigates. Stored as an inline mark in the document JSON.
- **Quality score is read-only here** — The Decision panel displays the score and exposes the inputs that compose it; the score itself is derived (see #07).
- **Type-colored tab indicator** — The active tab inherits the node-type color, reinforcing the type system across the app.

## Files & Components Affected

- `components/canvas/panels/NodePanel.tsx` — Shared shell
- `components/canvas/panels/TaskPanel.tsx` — Task body
- `components/canvas/panels/DocPanel.tsx` — Doc body with Tiptap editor
- `components/canvas/panels/DecisionPanel.tsx` — Decision body with quality inputs
- `components/canvas/editor/` — Tiptap extensions (slash commands, node mentions)
- `stores/canvas.store.ts` — Selected-node state, panel open/close, dirty tracking
- `app/api/v1/nodes/[id]/route.ts` — Patch endpoint per node type

## Dependencies

- **Depends on**: #05 Workflow Canvas (selection model)
- **Enables**: #07 Decision DNA View, #10 LazyMind AI Panel, #11 Thread Comments Panel, #25 Table Primitive

## Notes

- Pulse, Automation, Thread, and Table primitives have their own dedicated panels (#16, #17, #11, #25) that follow the same shell convention but live in their respective feature folders.
- Autosave is debounced at 800ms; explicit save isn't exposed — losing focus or closing the panel commits.
