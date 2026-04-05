# Design Spec — Import Modal

> Feature: 15 — Import Modal
> Date: 2026-04-05
> Fidelity: Mockup
> Status: Draft
> Iterations: 1

---

## Overview

**What was designed:** A 3-step wizard modal (max-w-2xl) for importing data from 6 external sources into Lazynext. The wizard progresses through source selection, connection/preview, and import progress with a live log, culminating in a success confirmation.

**Design brief:** `docs/features/15-import-modal/design-brief.md`

**Key design decisions:**
1. Wizard pattern (not a single form) — breaks a complex operation into digestible steps, reducing abandonment.
2. Import preview in Step 2 shows the exact mapping (Pages to DOC, DB rows to TASK) before committing — builds confidence and reduces "what will happen?" anxiety.
3. Live log in Step 3 provides transparency — users see each entity being imported, including skipped items with reasons, rather than staring at a blank progress bar.
4. Success state replaces the spinner in-place rather than navigating away — user stays in context and can choose to import more or go to the workflow.

---

## Section Breakdown

### 1. Modal Header

**Purpose:** Identify the modal purpose and provide a close action.

**Layout:** Flex row (px-6 py-4, border-b slate-700). Left: title "Import Your Data" (lg semibold) + subtitle (xs slate-400). Right: close button (w-8 h-8, X character).

**Key elements:**
- Title: "Import Your Data" — 18px/lg font-semibold
- Subtitle: "Bring your existing work into Lazynext" — 12px slate-400
- Close button: slate-400 text, hover:text-slate-200, hover:bg-slate-800

**Rationale:** Clear labeling sets expectations. Close button follows standard modal pattern (top-right X).

---

### 2. Step Indicator

**Purpose:** Show the user where they are in the 3-step process.

**Layout:** Horizontal bar (px-6 py-3, border-b slate-800, bg-slate-900/50). Flex row with 3 step groups connected by flex-1 line dividers.

**Key elements:**
- Step circles: w-6 h-6, rounded-full, centered number text (xs font-medium)
- Step labels: xs text beside each circle
- Connecting lines: flex-1 h-px bg-slate-700
- Active step: circle bg-primary, label text-primary font-medium
- Completed step: circle bg-green-500 with checkmark, label text-green-400
- Future step: circle bg-slate-700 text-slate-400, label text-slate-500

**Rationale:** Numbered stepper is the most universally understood wizard pattern. Green checkmarks on completed steps give positive reinforcement.

---

### 3. Step 1 — Choose Source

**Purpose:** Let the user select which external tool they are importing from.

**Layout:** Description paragraph + 2-column grid (grid-cols-2, gap-3) containing 6 source cards.

**Key elements per card:**
- Icon container: w-10 h-10, rounded-lg, colored background per source
- Source name: sm font-medium text-slate-200
- Description: 10px text-slate-500
- Optional badge: "Recommended" in green (Notion API only)
- Hover: border-primary/50 for recommended, border-slate-600 for others
- Click: advances to Step 2

| Source | Icon Color | Description |
|---|---|---|
| Notion (API) | slate-700 (N) | OAuth import of pages and databases — Recommended |
| Notion (ZIP) | slate-700 (N) | Upload export ZIP, no OAuth |
| Linear | purple-500/20 (Li) | Issues to Tasks with status, priority, assignee |
| Trello | blue-500/20 (Tr) | Boards to workflows, cards to Tasks |
| Asana | rose-500/20 (As) | Projects to workflows, tasks with subtasks |
| CSV | emerald-500/20 (CSV) | Upload CSV/TSV, map columns to Task fields |

**Rationale:** 2-column grid keeps all 6 sources visible without scrolling. "Recommended" badge guides users toward the best-supported path. Descriptions preview the mapping logic.

---

### 4. Step 2 — Connect (Notion API example)

**Purpose:** Configure the connection, preview the import mapping, and select the target workflow.

**Layout:** Vertical stack. Source identity row (icon + name + OAuth description). Import preview card (bg-slate-800). Workflow selector dropdown. CTA button. Back link.

**Key elements:**
- Source identity: w-10 h-10 icon + "Connect to Notion" (sm semibold) + OAuth description (10px)
- Import preview: bulleted checklist with green checkmarks for included items, gray dashes for excluded items
  - Pages to DOC nodes
  - Database rows to TASK nodes (if status/assignee columns found)
  - Nested pages to Edges (parent-child connections)
  - Images and files not imported (yet) — excluded/gray
- Workflow selector: full-width select with options (Q2 Product Sprint, Client Onboarding, + Create new workflow)
- CTA: "Connect Notion & Start Import" — full-width, bg-primary, white text
- Back link: "Back to sources" — full-width, text-slate-400

**Rationale:** Preview checklist manages expectations — users know exactly what will and will not be imported before clicking the CTA. The excluded item with gray dash prevents surprise omissions.

---

### 5. Step 3 — Import Progress

**Purpose:** Show real-time import status and provide transparent logging.

**Layout:** Centered spinner + status text at top. Three labeled progress bars in the middle. Scrollable log panel at bottom. Success state overlaid on completion.

**Key elements:**
- Spinner: w-14 h-14 circle, primary/10 bg, spinning SVG in primary color
- Status text: "Importing from Notion..." (sm semibold) + "This may take a minute..." (xs slate-400)
- Progress bars (3):
  - Pages (Docs): 12/18, green bar at 67%
  - Database rows (Tasks): 24/35, blue bar at 69%
  - Connections (Edges): 8/12, purple bar at 67%
  - All: h-2, rounded-full, bg-slate-800 track, progress-animate keyframe
- Live log: bg-slate-800, border slate-700, rounded-lg, max-h-32, mono font 10px
  - Green checkmark entries for successful imports
  - Amber warning for skipped items
  - Gray text for in-progress status
- Success state: bg-green-500/5 border, green checkmark circle, "Import Complete!" heading, summary text, two buttons (Go to Workflow primary, Import More secondary)

**Rationale:** Three separate progress bars for different entity types (Docs, Tasks, Edges) give granular feedback. The live log satisfies the "what is happening right now?" anxiety. Success state replaces the spinner in-place for smooth transition.

---

## States

| Component | State | Visual Treatment |
|---|---|---|
| Modal | Entry | scale-in animation (0.95 to 1.0, 200ms ease-out) |
| Step circle | Future | bg-slate-700, text-slate-400 |
| Step circle | Active | bg-primary (#4F6EF7), text-white |
| Step circle | Completed | bg-green-500, white checkmark |
| Source card | Default | bg-slate-800, border slate-700 |
| Source card | Hover | border shifts (primary/50 for recommended, slate-600 for others) |
| Import preview item | Included | green checkmark icon, text-slate-300 |
| Import preview item | Excluded | gray dash icon, text-slate-500 |
| CTA button | Default | bg-primary, text-white |
| CTA button | Hover | bg-[#3D5BD4] (darker primary) |
| Progress bar | Animating | progress-animate keyframe: width 0% to target over 3s ease-out |
| Spinner | Active | Rotating SVG circle, primary color |
| Log entry (success) | Static | Green checkmark + slate-400 text |
| Log entry (warning) | Static | Amber warning icon + slate-400 text |
| Success state | Visible | Green bordered card, replaces spinner section |
| Close button | Hover | text-slate-200, bg-slate-800 |

---

## Responsive Behavior

| Breakpoint | Component | Behavior |
|---|---|---|
| md+ (768px+) | Modal | max-w-2xl centered, comfortable padding |
| md+ | Source grid | 2 columns |
| md+ | Progress bars | Standard width |
| sm (640–767px) | Modal | max-w-xl, reduced padding |
| sm | Source grid | 2 columns (maintained) |
| <sm (<640px) | Modal | Near full-screen (mx-3, rounded-lg) |
| <sm | Source grid | 1 column |
| <sm | Step indicator | Labels hidden, circles only |
| <sm | Log panel | max-h-24 (reduced) |
| <sm | Success buttons | Stack vertically |

---

## Cognitive Load Assessment

**Information density:** Low per step — wizard pattern ensures the user only sees one step's worth of information at a time.

**Decision points:** Step 1 has 6 choices (source selection) — manageable with clear descriptions and a "Recommended" badge to guide. Step 2 has one decision (workflow target) with a sensible default. Step 3 has zero decisions — pure feedback.

**Anxiety management:** Import preview in Step 2 reduces "what will happen?" anxiety. Live log in Step 3 reduces "is it working?" anxiety. Success summary in Step 3 confirms the outcome.

**Cognitive load rating:** 2/5 — the wizard pattern is one of the lowest-cognitive-load patterns for multi-step operations.

---

## Accessibility Notes

- Step indicator should use `aria-current="step"` on the active step
- Source cards should be focusable buttons with `aria-label` including the source name and description
- Progress bars must have `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax`
- Live log should be an `aria-live="polite"` region so screen readers announce new entries
- Success state should trigger an `aria-live="assertive"` announcement: "Import complete. 18 docs, 35 tasks, and 12 connections imported."
- Close button needs `aria-label="Close import modal"`
- Workflow select needs associated `<label>`
- Focus should be trapped inside the modal while open
- On close, focus returns to the triggering element

---

## Design System Deviations

| Deviation | Reason |
|---|---|
| Source card icons use text abbreviations (N, Li, Tr, As, CSV) instead of SVG logos | Placeholder for real brand logos; brand assets not available at mockup stage |
| Progress bar colors (green, blue, purple) per entity type | Matches the entity-type color coding used elsewhere in the app (DOC = green, TASK = blue, EDGE = purple) |
| Log panel uses monospace font at 10px | Terminal-style aesthetic appropriate for technical import feedback; not part of standard body text styles |
| Spinner animation uses CSS @keyframes rather than Lottie | Keeps the modal lightweight; Lottie could be used for the success animation in production |
