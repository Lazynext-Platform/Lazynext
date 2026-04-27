# 📋 Summary — Task Views (Kanban + List)

> **Feature**: #37 — Task Views (Kanban + List)
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

Two alternative renderings for Task nodes — useful when teams need traditional task management views alongside the canvas. **Kanban**: 4 columns (Backlog / In Progress / In Review / Done) with status-colored headers, task-count badges, draggable cards (title, optional description, priority, assignee, progress bar for in-progress). **List**: sortable table with checkbox, task name, status pill, priority, assignee, due date. Done tasks show reduced opacity and strikethrough. Header includes view toggle, filter, sort, and per-column "Add task" buttons.

## Key Decisions

- **Same data, two renderers** — Both views read the workspace's Task nodes; switching is purely presentational. No separate "task" entity outside the node graph.
- **Drag-to-status updates the node** — Dropping a card in another Kanban column writes `data.status`, which cascades to the canvas node and any other view.
- **No swimlanes in v1.0** — Filters are global; swimlanes (per-assignee or per-priority rows) are deferred. Saves table complexity.
- **Filter shareable via URL** — Filter and sort state are URL params, so a "everything blocked" view can be saved as a bookmark or shared.

## Files & Components Affected

- `app/(app)/workspace/[slug]/tasks/page.tsx` — Page with view toggle
- `components/tasks/KanbanBoard.tsx`, `TaskListTable.tsx`
- `components/tasks/TaskCard.tsx` — Shared card primitive
- `lib/data/tasks.ts` — Filter / sort query helpers
- DnD via `@dnd-kit` (already in stack from canvas usage)

## Dependencies

- **Depends on**: #05 Workflow Canvas (shares Task node data), #09 Node Detail Panels (clicking a task opens the same panel)
- **Enables**: Sprint planning and standup workflows without leaving Lazynext

## Notes

- "Add task" creates a Task node in the active workflow at a default canvas position; appears in both views simultaneously.
- The progress bar uses `subtasks` ratio (done/total) — same data already powering the Task panel.
