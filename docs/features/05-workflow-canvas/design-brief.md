# Design Brief — Workflow Canvas

> **Feature**: 05 — Workflow Canvas
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: The primary application view -- a spatial canvas where users create, view, and connect workflow nodes (TASK, DOC, DECISION) with a collapsible sidebar, detail panel, minimap, and zoom controls.
**Why**: Provide a visual, graph-based workspace that makes relationships between tasks, documents, and decisions tangible and navigable, replacing separate tools with a unified spatial interface.
**Where**: Main app view after onboarding -- the default working surface at /ws/{workspace}/canvas.

---

## Target Users

- **Product managers**: Need to see the full project graph -- how tasks, docs, and decisions connect. Need to create and update nodes quickly.
- **Engineers**: Need to drill into task details, see decision context, and understand dependencies.
- **Team leads**: Need to assess project health at a glance via node statuses and decision scores.

---

## Requirements

### Must Have
- [x] Top bar (h-12): Sidebar toggle, workspace breadcrumb (Acme Corp / Q2 Product Sprint), "+ New Workflow" button, presence avatars (3 users), Share button, LazyMind AI button
- [x] Left sidebar (w-60, collapsible): Workflows list (3 items + "New Workflow"), Primitives palette (6 draggable chips: Task, Doc, Decision, Thread, Pulse, Automation), Workspace section (Members count, Settings), "Upgrade to Pro" button
- [x] Canvas area: Dot-grid background (20px spacing), absolutely-positioned node cards, SVG edge lines with arrowhead markers and dashed animation
- [x] 5 node cards: 2 TASKs (blue left-border), 1 DOC (green left-border), 2 DECISIONs (orange left-border) with statuses, assignees, priority dots, and quality scores
- [x] Right detail panel (w-96, collapsible): Decision node detail with Status, Question, Resolution, Rationale, Options Considered, Decision Type, Quality Score (progress bar + 84/100), Outcome, and Thread with 2 messages + comment input
- [x] SVG edges: 4 connection paths with dashed animation and arrowhead markers connecting nodes
- [x] Floating "+" add node button centered at canvas bottom
- [x] Zoom controls: +, -, fit view buttons stacked vertically
- [x] Minimap: Small overview of node positions with viewport rectangle

### Nice to Have
- [x] Node selection state with primary blue outline
- [x] Node hover with enhanced shadow and slight translateY
- [x] Sidebar collapse/expand animation (width 240px to 0)
- [x] Detail panel collapse/expand animation (width 384px to 0)
- [x] Presence avatars with overlapping stack (-8px margin)
- [x] Cursor: grab on node cards
- [x] Edge dash animation (0.8s linear infinite)
- [x] Node click opens/reopens detail panel

### Out of Scope
- Actual drag-and-drop node positioning
- Canvas panning and zooming
- Real-time collaboration cursors
- Node creation from primitives palette
- Actual edge drawing between nodes
- Search/filter functionality
- Multiple workflow tab management

---

## Layout

**Page type**: Full page (app shell, no scroll)
**Primary layout**: Three-column (sidebar + canvas + detail panel), header bar above
**Key sections** (in order):
1. **Top Bar** (h-12): Fixed header with workspace navigation, presence, and actions
2. **Left Sidebar** (w-60): Collapsible panel with workflows, primitives palette, and workspace nav
3. **Canvas** (flex-1): Main spatial area with dot grid, node cards, SVG edges, and floating controls
4. **Right Detail Panel** (w-96): Collapsible panel showing selected node details and thread

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Sidebar open (w-60), detail panel open (w-96) showing Decision 1, Decision 1 node selected (blue outline), canvas showing all 5 nodes with 4 edges |
| **Node selected** | Clicked node gets 2px primary blue outline. Detail panel shows that node's content. Other nodes deselected. |
| **Node deselected** | Click on empty canvas area removes selection from all nodes. |
| **Sidebar collapsed** | Width animates to 0, opacity to 0. Canvas expands to fill space. |
| **Panel collapsed** | Width animates to 0, opacity to 0. Canvas expands to fill space. |
| **Node hover** | Box shadow increases (0 8px 24px rgba(0,0,0,0.25)), translateY -1px. |
| **Empty** | Not shown -- would display empty state message on canvas |
| **Loading** | Not shown -- would display skeleton nodes |
| **Error** | Not shown |

**Key interactions**:
- **Sidebar toggle**: Hamburger button collapses/expands sidebar with width + opacity animation
- **Panel close**: X button collapses/expands detail panel
- **Node click**: Selects node, deselects others, opens detail panel if closed
- **Canvas click**: Deselects all nodes (if not clicking a node or button)
- **Primitives palette**: Chips are draggable="true" (visual only in mockup)
- **Add button**: Floating + button at canvas bottom center (no action in mockup)
- **Zoom controls**: +/- and fit-view buttons (no action in mockup)

---

## Responsive Behavior

- **Mobile** (< 1024px): Sidebar collapsed by default (width 0). Detail panel may overlay or be hidden. Canvas takes full width. Top bar hamburger toggles sidebar overlay.
- **Tablet**: Similar to mobile. Sidebar collapses. Detail panel may need to be full-screen overlay.
- **Desktop** (>= 1024px): Full three-column layout. Sidebar 240px, canvas flex, detail panel 384px. Desktop hamburger button visible for manual sidebar toggle.

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Workspace name** | Dynamic | "Acme Corp" |
| **Workflow name** | Dynamic | "Q2 Product Sprint" |
| **Sidebar workflows** | Dynamic | Q2 Product Sprint (active), Client Onboarding, Bug Triage |
| **Primitives** | Static | Task, Doc, Decision, Thread, Pulse, Automation |
| **Node: Task 1** | Dynamic | "Ship onboarding v2", AP assignee, Apr 10, High priority (orange dot), In Progress |
| **Node: Task 2** | Dynamic | "Fix auth redirect bug", PK assignee, Urgent (red dot), Done |
| **Node: Doc 1** | Dynamic | "Product Requirements Doc", Updated 2h ago, 1,240 words |
| **Node: Decision 1** | Dynamic | "Use Supabase for Auth + DB?", Score 84, Decided |
| **Node: Decision 2** | Dynamic | "Pricing: freemium vs trial?", Score 62, Open |
| **Detail panel** | Dynamic | Full decision detail: question, resolution (Supabase), rationale, options (Supabase/Firebase/PlanetScale), type (Irreversible), score 84/100, outcome (Pending), thread (2 messages from Priya and Avas) |
| **Presence avatars** | Dynamic | AP, PK, JR (3 online users) |

---

## Constraints

- Dark theme (bg-slate-950 canvas, bg-slate-900 sidebar/panel/header)
- Inter font family from Google Fonts
- Tailwind CSS via CDN
- Primary color: #4F6EF7
- Node cards use light-colored backgrounds (blue/green/orange tints) for readability against dark canvas
- Canvas uses CSS background-image for dot grid pattern (20px spacing)
- SVG edges use <path> with cubic bezier curves, dashed stroke, and arrowhead markers
- Fixed viewport (overflow: hidden on body) -- no page scrolling
- Node positions are absolute (hardcoded in mockup: left/top pixel values)
- Sidebar min-width constrained to prevent content wrap during collapse
- Panel min-width constrained similarly

---

## References

- Canvas patterns: Figma, Miro, tldraw spatial canvas
- Node-edge graph: React Flow, XState visualizer
- Detail panel: Linear issue detail sidebar
- Primitives palette: Notion block types sidebar
