# Design Spec — Task Views (Kanban + List)

> **Feature**: 37 — Task Views (Kanban + List)
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A dual-view task management page with toggleable Kanban board (4 status columns, draggable cards with priority/assignee/progress) and list/table view (sortable columns with checkboxes), plus filter/sort controls.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Board/List toggle in header (not tabs) for quick switching; Kanban columns use status-colored dots for instant recognition; progress bars only shown on in-progress cards; Done column at reduced opacity to de-emphasize completed work; list view uses checkboxes for bulk operations.

---

## Section Breakdown

### View Toggle & Controls
**Purpose**: Switch between Kanban and list views, apply filters
**Layout**: Header h-12, flex justify-between
**Key elements**: "Tasks" title + count badge, Board/List toggle (bg-slate-800 pill), Filter button, Sort button
**Rationale**: Toggle in header keeps it accessible from both views. Filter/sort apply to both views.

### Kanban Board
**Purpose**: Visual status-based task management
**Layout**: flex gap-4 overflow-x-auto, 4 columns (w-72 shrink-0)
**Key elements per column**: Status dot (colored), column name, task count badge. Cards: bg-slate-900 rounded-xl p-3 with title, optional description, progress bar (in-progress), priority badge (High red/Medium blue/Low slate), assignee avatar. "Add task" dashed-border button at column bottom.
**Rationale**: Standard Kanban layout familiar to project managers. Cards show just enough info for standup-level decisions.

### List View
**Purpose**: Dense, sortable task table
**Layout**: bg-slate-900 rounded-xl, grid-cols-12 rows
**Key elements**: Column headers (checkbox, Task, Status, Priority, Assignee, Due date), rows with checkboxes, status badges (colored pills), priority badges, assignee avatar+name, due dates (red for urgent). Done rows: opacity-50, strikethrough, checked checkbox.
**Rationale**: Table format enables quick scanning and sorting of many tasks. Checkboxes support bulk operations.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Kanban active** | Board view visible, "Board" toggle selected | Default view |
| **List active** | Table view visible, "List" toggle selected | |
| **Card hover** | border-slate-600 | Kanban cards |
| **Card selected** | ring-1 ring-[#4F6EF7]/20, border-[#4F6EF7]/30 | Active task |
| **Done task** | opacity-60, strikethrough | Both views |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | List view only, simplified columns, no Kanban |
| **Tablet (640–1024px)** | Both views available, Kanban horizontal scroll |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Accessibility Notes

- **Contrast**: Status/priority badges on dark backgrounds meet AA. White text on cards meets AA.
- **Focus order**: View toggle → filter/sort → column headers → cards/rows top-to-bottom, left-to-right
- **Screen reader**: Kanban columns need role="list" with status labels. Table needs proper th headers. Card actions need labels.
- **Keyboard**: Tab between cards/rows. Enter to open task. Arrow keys for Kanban column navigation.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Kanban column layout | New view pattern | Consider adding Kanban component to design system |
