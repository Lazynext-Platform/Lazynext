# Design Brief — Task Views (Kanban + List)

> **Feature**: 37 — Task Views (Kanban + List)
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Two alternative task views — a Kanban board with draggable columns (Backlog/In Progress/In Review/Done) and a sortable list/table view — with a view toggle, filter, and sort controls. Complements the canvas view for task-focused workflows.
**Why**: While the canvas shows task relationships, teams need traditional task management views for sprint planning, status tracking, and daily standups.
**Where**: Sidebar → Tasks (dedicated task management section, separate from canvas).

---

## Target Users
- **Project managers**: Using Kanban for sprint management
- **Individual contributors**: Checking personal task lists
- **Team leads**: Filtering and sorting for standup reviews

---

## Requirements

### Must Have
- [x] View toggle: Board (Kanban) / List with active state
- [x] Kanban board: 4 columns (Backlog, In Progress, In Review, Done) with status-colored dots, task count badges
- [x] Kanban cards: title, description (optional), priority badge, assignee avatar, progress bar (in-progress tasks)
- [x] List view: table with checkbox, task name, status, priority, assignee, due date columns
- [x] Filter and Sort buttons in header
- [x] "Add task" button in each Kanban column
- [x] Done tasks show reduced opacity and strikethrough

### Nice to Have
- [x] Due date urgency coloring (red for tomorrow, normal for future)
- [x] Progress bars on in-progress Kanban cards
- [x] Selected/active card highlight (blue ring)
- [x] Cursor-grab on Kanban cards

### Out of Scope
- Drag-and-drop between columns (mockup only shows layout)
- Task creation modal
- Subtasks/checklist within tasks
- Custom columns/statuses

---

## Layout

**Page type**: Full-page app view
**Primary layout**: Sidebar w-60 + header h-12 + content area
**Key sections**:
- **Kanban**: Horizontal scrolling columns (w-72 each) with card stacks
- **List**: Single table (bg-slate-900 rounded-xl) with sortable columns

---

## Responsive Behavior
- **Mobile**: List view only (Kanban columns too narrow), simplified table
- **Tablet**: Kanban with horizontal scroll, full list table
- **Desktop**: Full layout with both views available

---

## Constraints
- Task data comes from TASK primitive nodes on the canvas
- Status values: Backlog, In Progress, In Review, Done
- Priority values: High (red), Medium (blue), Low (slate)
- Must sync with canvas — changes in task views reflect on canvas nodes

---

## References
- Feature 05 (Workflow Canvas) — canvas-based task view
- Feature 06 (Mobile App View) — mobile NodeListView for tasks
- Feature 25 (Table Primitive) — structured data view (complementary)
