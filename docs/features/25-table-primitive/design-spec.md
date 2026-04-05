# Design Spec — TABLE Primitive

> **Feature**: 25 — TABLE Primitive
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A full spreadsheet-like grid view with 8 columns, 6 data rows, toolbar controls, inline editing, and footer stats — the TABLE primitive's primary interface.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Full-width table (not card-based) for data density; pill badges for status/priority for quick scanning; inline contenteditable for cell editing over modal-based editing; sticky header and footer for orientation during scrolling.

---

## Section Breakdown

### Toolbar
**Purpose**: Provide data manipulation controls
**Layout**: h-12 top bar with table name left, button group right
**Key elements**: Filter, Sort, Group, Hide (each with icon + label, bg-slate-800), Export CSV (with download icon), divider between control buttons and export
**Rationale**: Toolbar follows Airtable/Notion convention. Buttons are compact (text-xs) to fit multiple actions.

### Table Header
**Purpose**: Column labels with sort capability
**Layout**: Sticky top-0 z-10 row with bg-slate-900, text-xs uppercase labels
**Key elements**: Checkbox (select all), Title (with sort chevron), Status, Priority, Assignee, Due Date, Points, Tags, + (add column)
**Rationale**: Uppercase tracking-wider labels follow data table conventions. Sort indicator shows sortable columns.

### Table Body
**Purpose**: Display and edit structured data
**Layout**: 6 rows with alternating hover states, cell borders
**Key elements**: Row checkboxes, editable title cells, status pill badges (5 colors), priority pills (4 levels), assignee with avatar, date text, numeric points, tag pill groups
**Rationale**: Pill badges for status/priority provide instant visual scanning. Tags use node-type-adjacent colors.

### Table Footer
**Purpose**: Summary statistics
**Layout**: h-8 sticky bottom bar with counts and aggregations
**Key elements**: Row count (6), Sum Points (37), status breakdown, "Phase 3 Feature" label
**Rationale**: Footer stats eliminate need to manually count/sum. Phase 3 label provides context.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | All rows visible, no filters | Hover highlights rows |
| **Cell focused** | Blue outline ring on editable cell | contenteditable focus style |
| **Column resize** | col-resize cursor on header edge | Drag to resize |
| **Row hover** | bg-slate-900/50 background | Group hover class |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, table scrolls horizontally, only Title+Status visible without scroll |
| **Tablet (640–1024px)** | Sidebar visible, most columns visible |
| **Desktop (> 1024px)** | Full layout, all columns visible, min-w-[900px] table |

---

## Cognitive Load Assessment

- **Information density**: High — spreadsheet format is inherently data-dense, but column types (pills, avatars) aid scanning
- **Visual hierarchy**: Clear — Title column is widest and contains bold text; status/priority pills use color for instant recognition
- **Progressive disclosure**: Table is the summary; clicking a row would open detail panel (not mocked)
- **Interaction complexity**: Medium — inline editing, sorting, filtering are familiar spreadsheet interactions

---

## Accessibility Notes

- **Contrast**: Status pills use colored text on tinted backgrounds with sufficient contrast. White text on slate-800/950 meets AA.
- **Focus order**: Toolbar buttons → header cells → body cells row by row → footer
- **Screen reader**: Table needs proper th/td semantics. Status pills need aria-label.
- **Keyboard**: Tab between cells, Enter to edit, Arrow keys for navigation within table.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Teal color for TABLE type | New primitive color not in current 6-type palette | Yes — add TABLE teal tokens when Phase 3 ships |
