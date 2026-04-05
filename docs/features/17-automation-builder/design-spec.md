# Design Spec — Automation Builder

> **Feature**: 17 — Automation Builder
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A two-view automation interface — a list view showing 4 automations with active/paused toggles, and a builder detail view with WHEN trigger configuration, THEN action blocks, and a run history table.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: WHEN-THEN visual pattern with colored circle badges (amber W, green T) for clear trigger/action separation; list-to-builder toggle instead of inline editing; run history embedded within the builder for immediate context on automation behavior.

---

## Section Breakdown

### Sidebar Navigation

**Purpose**: App-level navigation context showing Automations as active page
**Layout**: Fixed w-60 sidebar with workspace logo, nav links, Automations highlighted
**Key elements**:
- Workspace logo (w-8 h-8 bg-[#4F6EF7]) with "L" + "Acme Corp" label
- Nav items: Canvas, Decisions, PULSE, Automations (active: bg-slate-800 font-medium)

**Rationale**: Standard app shell pattern. Automations gets its own top-level nav entry since it's a distinct management view, not a sub-page.

### Automations List

**Purpose**: Overview of all automations with quick enable/disable control
**Layout**: Vertical stack of cards (space-y-3) under header with count and filter buttons
**Key elements**:
- Header: "Active Automations (4)" + filter pills (All, Active, Paused) — text-[10px] bg-slate-800
- Automation card: bg-slate-900, border-slate-700, rounded-lg, p-4
- Card left: Color-coded icon (w-9 h-9 rounded-lg with 10% opacity background), name + badge, description, trigger stats
- Card right: Toggle switch (w-9 h-5) with peer-checked:bg-green-500
- Paused card: opacity-70 with "Paused" badge (bg-slate-700)

**Rationale**: Cards provide enough context (name, description, frequency) to manage automations without opening each one. Toggle provides immediate control.

### Builder Header

**Purpose**: Identify and control the automation being edited
**Layout**: px-6 py-4 border-b with editable name input left, status badge + Save button right
**Key elements**:
- Editable name: bg-transparent text-lg font-semibold, focus:border-b with brand blue
- Active badge: text-[10px] green-400 on green-500/10 pill
- Save button: bg-[#4F6EF7] text-xs rounded-md

**Rationale**: Inline name editing reduces friction. Save is prominent but not dominant — the builder is the focus.

### WHEN (Trigger) Section

**Purpose**: Define what event triggers the automation
**Layout**: Amber "W" badge + label, then indented (ml-9) config card with dropdowns
**Key elements**:
- Badge: w-7 h-7 rounded-full, bg-amber-500/20, text-amber-400, "W"
- Config card: bg-slate-800 border-slate-700 rounded-lg p-4
- Trigger type: Full-width select (6 options)
- Node type + Status: 2-column grid with selects

**Rationale**: Amber color for triggers follows a warm/attention color convention. Two-column grid for related fields (node type + condition) saves vertical space.

### THEN (Actions) Section

**Purpose**: Define what happens when the trigger fires
**Layout**: Green "T" badge + label, then indented action cards (removable), add button at bottom
**Key elements**:
- Badge: w-7 h-7 rounded-full, bg-green-500/20, text-green-400, "T"
- Action cards: bg-slate-800 rounded-lg p-4 with numbered labels
- Action 1 (email): action type select, send-to select, message textarea with template variables
- Action 2 (field update): action type select, field/value in 2-column grid
- Remove button: text-[10px] text-red-400 per action
- Add action: Full-width dashed border button, text-slate-500

**Rationale**: Multiple actions per automation allows powerful chains. Template variables in textarea show users the data model. Dashed add button clearly signals extensibility.

### Visual Connector

**Purpose**: Show the causal flow from trigger to actions
**Layout**: Centered vertical line (w-px h-8 bg-slate-700) + downward triangle SVG, indented with ml-9
**Key elements**:
- Vertical line segment
- Downward pointing triangle (slate-600)

**Rationale**: Visual connector reinforces the WHEN→THEN causality. Simple and lightweight — doesn't compete with the content.

### Run History

**Purpose**: Show recent execution results for debugging and monitoring
**Layout**: Border-top separated section with table (4 rows)
**Key elements**:
- Table headers: Triggered At, Trigger Event, Status, Details — text-xs text-slate-500
- Success rows: green checkmark + "Success" text
- Failed rows: red X + "Failed" text with red detail message
- Alternating row borders: border-slate-700/50

**Rationale**: Inline run history eliminates context switching. Failed runs prominently flagged in red for quick identification.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **List view** | 4 automation cards with toggles visible | Default on page load |
| **Builder view** | List hidden, builder panel shown | Triggered by card click or "+ New Automation" |
| **Active automation** | Full opacity, green toggle, "Active" badge | 3 of 4 sample automations |
| **Paused automation** | 70% opacity, slate toggle, "Paused" badge | Weekly digest email |
| **Run success** | Green checkmark + "Success" in status column | 3 of 4 history rows |
| **Run failed** | Red X + "Failed" with red detail text | 1 history row (invalid email) |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, builder dropdowns stack single-column, run history table scrolls horizontally |
| **Tablet (640–1024px)** | Sidebar visible, 2-column grids maintained |
| **Desktop (> 1024px)** | Full layout as designed — sidebar w-60, content max-w-5xl centered |

---

## Cognitive Load Assessment

- **Information density**: Medium in list view (name + description + stats per card), High in builder (multiple dropdowns, textarea, table)
- **Visual hierarchy**: Clear — WHEN/THEN badges create strong visual anchors; color coding (amber trigger, green actions) provides instant orientation
- **Progressive disclosure**: List → builder is a natural drill-down; actions are individually expandable via "add another action"
- **Interaction complexity**: Moderate — builder requires selecting from multiple dropdowns and editing text, but the WHEN-THEN pattern is intuitive

---

## Accessibility Notes

- **Contrast**: White/light text on slate-800/900 backgrounds meets AA. Green/red status indicators pair text with icons (not color-alone).
- **Focus order**: Back link → name input → status badge → Save → trigger dropdowns → action dropdowns → textarea → remove buttons → add action → run history table
- **Screen reader**: Toggle switches need aria-label ("Enable automation"). Status badges need aria-label for success/failed states.
- **Keyboard**: All form controls are native HTML elements (select, input, textarea, checkbox) with built-in keyboard support

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Amber/Green circle badges for WHEN/THEN | Domain-specific visual pattern for automation builder | No — specific to this feature |
| Unicode symbols for icons (⚡, ✓, ✗) | HTML mockup simplification — production would use SVG icons | No — mockup limitation |
