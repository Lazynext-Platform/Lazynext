# 📋 Summary — Table Primitive

> **Feature**: #25 — Table Primitive
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The 7th node primitive — TABLE — implemented as a `TablePanel` with a sticky-header grid, inline-editable cells, 8 typed columns (Title, Status pills, Priority, Assignee, Due Date, Points, Tags, +checkbox), a toolbar (Filter / Sort / Group / Hide fields / Export CSV), and a summary footer with row count + sum-of-points + status totals. A TABLE node on the canvas opens the panel with its own data; the same panel powers the dedicated Tables view in the sidebar.

## Key Decisions

- **TABLE is a node, not a separate concept** — Like every other primitive, a TABLE lives in the `nodes` table with `type = 'table'` and JSONB `data` for columns + rows. Keeps the data model uniform.
- **Schema-flexible columns** — `data.columns` is an array of `{ id, name, type, options? }`; rows are `{ [columnId]: value }`. Supports adding/removing columns without migrations.
- **Inline editing only** — No bulk-edit modal; double-click a cell to edit. Optimistic update + autosave matches the rest of the app.
- **Phase 3 framing** — Listed in Phase 3 of the roadmap because v1.0 prioritized graph primitives over tabular. Shipping early made the 7-primitive promise on the landing page (#01) real.

## Files & Components Affected

- `components/canvas/panels/TablePanel.tsx` — Grid + toolbar + footer
- `components/canvas/panels/table/Cell.tsx` — Per-type cell editors
- `components/canvas/nodes/TableNode.tsx` — Canvas representation
- `lib/canvas/table-schema.ts` — Column types + validation
- `app/(app)/workspace/[slug]/tables/page.tsx` — Dedicated Tables view
- `app/api/v1/nodes/[id]/route.ts` — Reused; PATCH writes `data.columns` / `data.rows`

## Dependencies

- **Depends on**: #05 Workflow Canvas, #09 Node Detail Panels (shell convention), #29 Node Creation Menu (TABLE was previously "Coming in Phase 3" — now shipped)
- **Enables**: Sprint backlogs, feature trackers, and any structured data inside the workflow

## Notes

- "Group" is currently grouping by Status only; arbitrary group-by is a follow-up.
- CSV export reuses #21 Data Export's CSV writer for consistency.
