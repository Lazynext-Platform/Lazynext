# Design Spec — Node Detail Panels

> **Feature**: 09 — Node Detail Panels
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: Three tabbed detail panels (Task, Doc, Decision) that serve as the primary editing interface for Lazynext's core node primitives. Each panel has a distinct layout and field set appropriate to its node type.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Tab-based navigation allows showcasing all three panels in one mockup. Color-coded indicators (blue/emerald/orange) match the established primitive color system. Doc panel is wider than Task/Decision panels to accommodate the rich text editor.

---

## Section Breakdown

### Tab Navigation Bar
**Purpose**: Switch between the three node panel types
**Layout**: Sticky top bar (z-50), full-width flex with 3 equal-width tab buttons
**Key elements**:
- Task Panel tab: blue dot indicator
- Doc Panel tab: emerald dot indicator
- Decision Panel tab: orange dot indicator
- Active tab: blue bottom border + white text + blue tinted background
**Rationale**: Color dots instantly communicate which primitive type each tab represents, matching canvas node colors

### Task Panel — Header
**Purpose**: Identify node type and provide close action
**Layout**: Flex row with type badge left, close button right
**Key elements**:
- Blue dot (w-3 h-3) + "TASK" label (uppercase, blue-400, tracking-wider)
- Close button (X icon, hover bg-slate-800)
**Rationale**: Consistent header pattern across all three panels; uppercase type label with color reinforces node identity

### Task Panel — Fields
**Purpose**: View and edit all task properties
**Layout**: Vertical stack (space-y-5) within p-5 padding
**Key elements**:
- **Title**: Full-width transparent input (text-xl, font-bold), inline-editable
- **Status**: Dropdown with colored dot indicators (Todo=slate, In Progress=blue, In Review=purple, Done=emerald, Blocked=red)
- **Priority**: 4-button segmented control (Low/Medium/High/Urgent) with active state showing colored border-2 and tinted background
- **Assignee**: Dropdown with gradient avatar circles and names
- **Due Date**: Date input with calendar icon
- **Description**: Textarea with placeholder
- **Subtasks**: Checkbox list with checked items showing line-through text; "+ Add subtask" button
- **Tags**: Pill badges (blue-500/15 bg, blue-400 text) + dashed circle add button
- **Attachments**: Dashed border upload button
- **Delete**: Red text link separated by top border
**Rationale**: Fields are ordered by importance and frequency of use — status and priority at top, less-used attachments and delete at bottom

### Doc Panel — Header & Toolbar
**Purpose**: Document metadata and formatting controls
**Layout**: Header bar with metadata, collaborator avatars below, then floating toolbar
**Key elements**:
- Green dot + "DOC" label + "1,240 words" + "Last edited 2h ago" + Share button + close
- Collaborator avatar stack (AP, RK, PD) + "+ Invite" dashed button
- Floating toolbar: B/I/U/S, H1/H2/H3, List/Code link, Link/Code/Quote, "/" command hint
**Rationale**: Toolbar follows Tiptap/Notion convention; collaborator presence builds awareness of shared editing

### Doc Panel — Editor
**Purpose**: Rich text editing area
**Layout**: Large content area (min-h-400px) with bg-slate-800/50 and border, prose-invert styling
**Key elements**:
- Sample content: "Overview" heading, paragraph about Q2 sprint, "Key Requirements" heading with bullet list, "Timeline" heading with paragraph
- Inline node mention: "@Ship onboarding v2" as blue pill badge
- Slash command state: "/" with blinking cursor showing the command trigger
- Slash command dropdown: 7 block types (Task, Doc, Decision, Heading, Bullet List, Code Block, Table) each with icon, title, and description
**Rationale**: Real content demonstrates the editor's capability; slash command dropdown shows the unique Lazynext feature of inserting linked node references

### Decision Panel — Fields
**Purpose**: View and edit decision properties including Decision DNA-specific fields
**Layout**: Narrow column (max-w-sm), vertical stack (space-y-5)
**Key elements**:
- **Title**: Inline-editable input
- **Status**: Dropdown with colored status badges (Open=slate, In Discussion=amber, Decided=emerald, Revisit=red)
- **Question**: Read-only text block (bg-slate-800, rounded)
- **Resolution**: Editable textarea
- **Rationale**: Editable textarea (longer, 3 rows)
- **Options Considered**: Pill chips — chosen option has emerald border-2 and tinted bg; others have slate border; "+ Add" dashed button
- **Decision Type**: Dropdown (Reversible / Irreversible)
- **Quality Score**: Featured display card — large "84" in emerald, "/100" in slate, gradient progress bar, helper text "Good options coverage. Strong rationale."
- **Outcome**: Dropdown (Pending, Good=emerald, Bad=red, Neutral=slate)
- **Made by**: Author card with avatar, name, date
- **Thread**: Collapsible section with comment count, chevron toggle, comment list, and comment input
**Rationale**: Quality Score gets prominent display as the core Decision DNA metric; collapsible thread prevents the panel from becoming too long

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Task tab active** | Task panel visible, others hidden | Default state on load |
| **Doc tab active** | Doc panel visible at wider width | Switches on click |
| **Decision tab active** | Decision panel visible | Switches on click |
| **Dropdown open** | One dropdown visible at a time | Outside click closes |
| **Priority selected** | Active button shows colored border-2 + tinted bg | Other buttons reset to slate |
| **Subtask checked** | Text gets line-through styling | Checkbox checked state |
| **Slash command open** | Dropdown appears at cursor position in editor | First item highlighted |
| **Thread expanded** | Comments visible, chevron rotated 180deg | Hidden by default |
| **Thread collapsed** | Comments hidden, chevron default | Saves vertical space |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Panel takes full viewport width; tab bar sticky; Doc toolbar wraps |
| **Tablet** (640-1024px) | Panel overlays at ~400px; all content fits within panel width |
| **Desktop** (> 1024px) | Panel as right-side column; Task/Decision at max-w-sm, Doc at max-w-4xl |

---

## Cognitive Load Assessment
- **Information density**: Medium — Task panel has 10 field sections but each is compact; Decision panel is denser with quality score and thread
- **Visual hierarchy**: Strong — color-coded headers, prominent quality score card, and clear section labels guide attention
- **Progressive disclosure**: Good — thread is collapsed by default; slash commands appear on trigger; dropdowns only show on interaction
- **Interaction complexity**: Medium — multiple dropdown types, priority segmented control, checkbox subtasks, and slash command system

---

## Accessibility Notes
- **Contrast**: Colored indicators (blue/emerald/orange) on dark backgrounds meet contrast requirements; text inputs have visible focus states
- **Focus order**: Tab buttons > panel header > fields in order from top to bottom > close button
- **Screen reader**: Tab buttons should announce active state; dropdowns should announce selected value; subtask checkboxes announce checked/unchecked state
- **Keyboard**: Tab cycling through fields; Enter/Space to toggle dropdowns and checkboxes; Escape to close dropdowns; "/" triggers slash command in editor

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| 3-panel tab layout | Mockup presentation pattern — production will show one panel at a time | No — mockup-only |
| Floating rich-text toolbar | Doc-specific editor toolbar; Tiptap integration pattern | Yes — add editor toolbar component |
| Slash command dropdown | Unique Lazynext feature for node insertion | Yes — add slash command pattern |
| Priority segmented control | Task-specific 4-option selector with color states | Yes — add segmented button group |
