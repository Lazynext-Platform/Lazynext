# Design Spec — Workflow Canvas

> **Feature**: 05 — Workflow Canvas
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: The primary application view -- a three-column layout with collapsible sidebar, spatial node-edge canvas, and collapsible detail panel, all within a fixed-viewport app shell.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Light-colored node cards on dark canvas for high readability; Decision node selected by default to showcase the detail panel; three-column layout with collapsible side panels to maximize canvas space; primitives palette in sidebar for easy node creation; thread/comments embedded in the detail panel rather than a separate view.

---

## Section Breakdown

### Top Bar

**Purpose**: Workspace navigation, presence awareness, and quick access to AI and sharing.
**Layout**: Fixed header, h-12, bg-slate-900, border-b, flex justify-between. Left: toggles + breadcrumbs. Right: avatars + actions.
**Key elements**:
- Sidebar toggle buttons: Mobile hamburger (lg:hidden) + desktop hamburger (hidden lg:block)
- Breadcrumb: "Acme Corp" (workspace, semibold white) / "Q2 Product Sprint" (workflow, medium slate-300), both with dropdown chevrons
- "+ New Workflow" button in muted text
- Presence avatar stack: 3 overlapping circles (AP indigo, PK emerald, JR amber) with -8px margin overlap
- Share button: Icon + text, slate-400
- LazyMind button: Primary blue bg, star icon, "LazyMind" text, shadow

**Rationale**: Breadcrumb pattern communicates workspace hierarchy. Presence avatars show real-time collaboration. LazyMind button is visually prominent (primary bg) to encourage AI usage.

---

### Left Sidebar

**Purpose**: Navigation between workflows, access to the primitives palette, and workspace management.
**Layout**: w-60 (240px), bg-slate-900, border-r, flex column, overflow-y-auto. Collapsible to 0 width.
**Key elements**:

**Workflows section**:
- Section header: "WORKFLOWS" in 10px uppercase tracking-widest slate-500
- 3 workflow items: Active (Q2 Product Sprint) has bg-slate-800/70, primary dot, white text. Inactive items have transparent bg, slate-400 text.
- "+ New Workflow" item with plus icon

**Primitives section**:
- Section header: "PRIMITIVES" in same style
- 6 draggable chips: Task (blue dot), Doc (emerald dot), Decision (orange dot), Thread (purple dot), Pulse (cyan dot), Automation (slate dot)
- Each chip: Flex row, colored dot + text label, hover bg, cursor grab

**Workspace section**:
- Section header: "WORKSPACE"
- Members (4): Shows 3 mini avatar dots + count
- Settings: Gear icon + text
- "Upgrade to Pro" button: Primary border, primary text, hover bg

**Rationale**: Three-section sidebar organizes by frequency of use. Primitives palette with draggable chips enables node creation. "Upgrade to Pro" placed at sidebar bottom for visibility without being intrusive.

---

### Canvas

**Purpose**: The primary spatial workspace where nodes live and relationships are visualized.
**Layout**: flex-1, relative, bg-slate-950 with CSS dot grid, overflow-hidden.
**Key elements**:

**Dot grid background**:
- CSS background-image with radial-gradient (slate-500/25 dots, 1px size, 20px spacing)

**Node cards** (5 total, absolutely positioned):
- TASK 1 "Ship onboarding v2" (left:100, top:80): Blue left border, EFF6FF bg, AP avatar, Apr 10, orange priority dot, "In Progress" badge
- TASK 2 "Fix auth redirect bug" (left:100, top:280): Blue left border, PK avatar, red priority dot, "Done" badge
- DOC "Product Requirements Doc" (left:420, top:80): Green left border, F0FDF4 bg, "Updated 2h ago", "1,240 words"
- DECISION 1 "Use Supabase for Auth + DB?" (left:420, top:280): Orange left border, FFF7ED bg, score 84 badge, "Decided" status, **selected state** (blue outline)
- DECISION 2 "Pricing: freemium vs trial?" (left:740, top:180): Orange left border, score 62 badge, "Open" status

**SVG edges** (4 connections):
- Task1 -> Doc1: Horizontal bezier curve at y=120
- Doc1 -> Decision1: Vertical bezier curve at x=540
- Decision1 -> Decision2: Diagonal bezier curve
- Task2 -> Decision1: Horizontal bezier curve at y=330
- All edges: #64748b stroke, 1.5px width, dashed (6 6), arrowhead markers, 0.8s dash animation

**Floating controls**:
- Add button: Centered bottom, w-12 h-12, primary bg, white + icon, shadow, hover scale-110
- Zoom controls: Bottom-right stack, 3 buttons (+, -, fit-view) in slate-800 bg with slate-700 border
- Minimap: Bottom-right, w-36 h-24, slate-900/90 bg, viewport rectangle + 5 colored dots representing nodes

**Rationale**: Light-colored node cards on dark canvas create high contrast and visual pop. Absolutely-positioned nodes allow spatial freedom. SVG bezier curves with animated dashes suggest data flow. Minimap provides orientation in larger canvases.

---

### Right Detail Panel

**Purpose**: Show full details of the selected node without leaving the canvas context.
**Layout**: w-96 (384px), bg-slate-900, border-l, overflow-y-auto. Collapsible to 0 width.
**Key elements**:

**Panel header**: Orange dot + "DECISION" label + X close button

**Content sections** (scrollable):
- Title: "Use Supabase for Auth + DB?" in lg bold
- Status: "Decided" in emerald pill with dot indicator
- Question: Full question text
- Resolution: Highlighted box (bg-slate-800/50, border, p-3): "Supabase -- unified Auth + PostgreSQL, RLS policies, real-time subscriptions, generous free tier."
- Rationale: "Supabase provides auth, database, and storage in one platform. RLS policies give row-level security out of the box."
- Options Considered: 3 tags (Supabase, Firebase, PlanetScale) + "+ Add" dashed button
- Decision Type: "Irreversible" dropdown
- Quality Score: Progress bar (84% fill, emerald-500) + "84/100" text + "Good options coverage. Strong rationale." description
- Outcome: "Pending" dropdown + Tag button
- Thread: 2 messages (Priya: "Why not PlanetScale?", Avas: "MySQL syntax + no RLS. Supabase wins on DX.") + comment input with send button

**Rationale**: Panel width (384px) provides comfortable reading without dominating the canvas. Thread integration below decision details creates contextual discussion. Quality score progress bar provides at-a-glance assessment. All field labels use consistent 11px uppercase tracking-wider style.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | Three-column layout. Decision 1 selected (blue outline). Detail panel shows Decision 1. Sidebar open. | Initial app load |
| **Node selected** | 2px solid #4F6EF7 outline, 1px offset. Detail panel updates. | Click handler on .node-card |
| **Node hover** | box-shadow: 0 8px 24px rgba(0,0,0,0.25), translateY: -1px | CSS :hover |
| **Canvas click** | All nodes deselected (selected class removed) | Ignores clicks on nodes/buttons |
| **Sidebar collapsed** | Width 0, opacity 0, border-right 0. Canvas expands. | Toggle via hamburger |
| **Sidebar expanded** | Width 240px, opacity 1, border-right 1px. | Toggle or initial state (desktop) |
| **Panel collapsed** | Width 0, opacity 0, border-left 0. Canvas expands. | X button click |
| **Panel expanded** | Width 384px, opacity 1, border-left 1px. | Node click when closed |
| **Primitive hover** | Background rgba(100,116,139,0.18) | CSS transition 0.12s |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 1024px) | Sidebar collapsed by default (width 0). Only mobile hamburger visible. Detail panel may need overlay treatment. Canvas fills viewport. |
| **Tablet** (640-1024px) | Same as mobile. Sidebar overlays when toggled. |
| **Desktop** (>= 1024px) | Full three-column layout. Both desktop hamburger and sidebar visible. Detail panel open by default. |

---

## Cognitive Load Assessment

- **Information density**: High -- the most complex view in the application. Multiple node types, edge connections, detail panel with 10+ fields, sidebar with 3 sections. Mitigated by clear spatial layout and collapsible panels.
- **Visual hierarchy**: Clear -- node cards draw primary attention through color contrast against dark canvas. Selected node (blue outline) draws focus. Detail panel heading is the secondary focus. Sidebar is tertiary navigation.
- **Progressive disclosure**: Node cards show summary (title, status, assignee). Full detail only appears in the right panel on selection. Thread is at the bottom of the detail panel. Options Considered, Decision Type, and Outcome are below the fold.
- **Interaction complexity**: Medium -- node selection, panel toggling, potential drag-and-drop (not yet implemented). The canvas itself has no complex multi-step interactions in the mockup.

---

## Accessibility Notes

- **Contrast**: Light node cards (EFF6FF, F0FDF4, FFF7ED) with dark text (1E40AF, 166534, 9A3412) provide strong contrast. White text on slate-900 panels (~15:1). SVG edges at 0.3 opacity may be hard to see for low-vision users.
- **Focus order**: Top bar (sidebar toggle -> breadcrumbs -> avatars -> share -> LazyMind) -> Sidebar (workflows -> primitives -> workspace) -> Canvas nodes (left to right, top to bottom) -> Detail panel fields -> Thread input
- **Screen reader**: Node cards should be announced with type, title, and status. Detail panel should announce when opened/closed. SVG edges are decorative. Minimap is decorative. Zoom controls need aria-labels.
- **Keyboard**: Node cards need keyboard focus and Enter/Space to select. Sidebar toggle, panel close, and floating buttons are all button elements. Canvas navigation may need arrow key support for spatial movement.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Light-colored node cards on dark canvas | High contrast requirement for spatial readability | Yes -- document node card color system |
| Fixed viewport (no scroll) | Canvas app pattern -- content is spatial, not scrollable | No -- canvas-specific |
| Hardcoded node positions (absolute px) | Mockup fidelity -- real implementation uses drag positioning | No -- implementation detail |
| Thread embedded in detail panel | Contextual discussion saves a separate view | Yes -- document thread placement pattern |
| Edge dash animation | Visual indicator of data flow direction | No -- decorative enhancement |
