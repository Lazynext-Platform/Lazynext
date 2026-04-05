# Design Brief — TABLE Primitive

> **Feature**: 25 — TABLE Primitive
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A spreadsheet-like grid view for the TABLE primitive (Phase 3), with inline editing, column types, filter/sort/group/hide controls, and CSV export.
**Why**: Teams need structured tabular data alongside their graph-based workflow — sprint backlogs, feature trackers, and data that doesn't fit neatly into individual nodes.
**Where**: Dedicated TABLE view accessible from sidebar, or as a node type on the canvas.

---

## Target Users

- **Project managers**: Tracking sprint backlogs and task boards in table format
- **Team leads**: Sorting and filtering work items by status, assignee, priority
- **All users**: Viewing structured data with familiar spreadsheet interactions

---

## Requirements

### Must Have
- [x] Full-width table grid with 8 columns: Checkbox, Title (editable), Status (pill badges), Priority, Assignee (avatar+name), Due Date, Points, Tags
- [x] 6 sample data rows with realistic sprint backlog data
- [x] Toolbar: Filter, Sort, Group, Hide fields, Export CSV buttons
- [x] Sticky header row with column names and sort indicators
- [x] "New row" add button at bottom
- [x] Footer with row count, sum of Points (37), and status summary
- [x] Sidebar with Tables nav item highlighted
- [x] TABLE type badge (teal) in top bar

### Nice to Have
- [x] Column resize handles (col-resize cursor on hover)
- [x] Inline cell editing via contenteditable
- [x] Add column button (+) in header row
- [x] Row selection checkboxes
- [x] "Phase 3 Feature" label in footer

### Out of Scope
- Column type configuration modal
- Row detail panel/modal
- Linked records picker
- Formula columns
- Table creation wizard

---

## Layout

**Page type**: Full-page app view
**Primary layout**: App shell (sidebar w-60 + top bar h-12) + full-width scrollable table
**Key sections** (in order):
1. **Sidebar**: Workspace nav with "Tables" highlighted
2. **Top bar**: Table name + teal badge + toolbar buttons (Filter, Sort, Group, Hide, Export CSV)
3. **Table grid**: Sticky header + 6 data rows + "New row" button
4. **Footer**: Row count, column sum, status summary, Phase 3 label

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | All 6 rows visible, no filters applied |
| **Cell editing** | Click cell to edit inline (contenteditable focus ring) |
| **Row selected** | Checkbox checked, row may highlight |
| **Filtered/Sorted** | Rows reordered or hidden based on active filters |

**Key interactions**:
- Click cell to edit inline (Title column is contenteditable)
- Click column header to sort
- Hover column header edge for resize cursor
- Click toolbar buttons for filter/sort/group/hide panels
- Click "New row" to add empty row
- Click "Export CSV" to download table data

---

## Responsive Behavior

- **Mobile**: Table scrolls horizontally, sidebar hidden, minimal columns visible
- **Tablet**: Sidebar visible, table scrolls if needed
- **Desktop**: Full table grid fits within viewport with horizontal scroll for many columns

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Table name** | Dynamic | "Sprint Backlog" |
| **Row titles** | Dynamic | "Ship onboarding v2", "Fix auth redirect bug", etc. |
| **Status values** | Enum | Todo, In Progress, In Review, Done (color-coded pills) |
| **Priority values** | Enum | Urgent (red), High (orange), Medium (yellow), Low (slate) |
| **Assignees** | Dynamic | Avatar + name (Avas Patel, Raj Kumar, etc.) |
| **Tags** | Dynamic | Colored tag pills (frontend, bug, auth, infra, etc.) |
| **Footer stats** | Computed | "6 rows", "Sum Points: 37", "3 In Progress, 1 Done..." |

---

## Constraints

- Phase 3 feature — not in MVP or Phase 2
- TABLE uses teal color coding (teal-400/500) distinct from other 6 primitives
- Cell editing uses native contenteditable with focus ring (outline: 2px solid #4F6EF7)
- Table must support horizontal scrolling for many columns (min-w-[900px])
- Footer is sticky at bottom (h-8, bg-slate-900)

---

## References

- Airtable, Notion tables, Linear table view for spreadsheet-like patterns
- Design system: node type colors (teal for TABLE), form patterns
