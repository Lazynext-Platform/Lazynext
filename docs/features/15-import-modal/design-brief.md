# Design Brief — Import Modal

> Feature: 15 — Import Modal
> Date: 2026-04-05
> Target Fidelity: Mockup

---

## Overview

**What:** A 3-step wizard modal that guides users through importing data from external tools (Notion API, Notion ZIP, Linear, Trello, Asana, CSV) into Lazynext workflows. Step 1 selects the source, Step 2 configures the connection and previews what will be imported, Step 3 shows real-time import progress with a live log.

**Why:** Migration friction is the top barrier to adoption for any workflow tool. A clear, guided import experience reduces abandonment during onboarding by showing users exactly what will happen before they commit, and providing transparent progress feedback during the import.

**Where:** Modal overlay, triggered from onboarding flow, settings, or a "Import" action in the sidebar/toolbar. Renders centered over a dimmed backdrop.

---

## Target Users

| Persona | Goal |
|---|---|
| New user (onboarding) | Migrate existing work from Notion, Linear, Trello, or Asana into Lazynext |
| Workspace admin | Bulk import data from CSV/spreadsheet into a workflow |
| Returning user | Import additional data from another tool after initial setup |

---

## Requirements

### Must Have
- [x] 3-step wizard with visual step indicator (numbered circles + labels connected by lines)
- [x] Step 1 — Source selection: 6 source cards in a 2-column grid (Notion API, Notion ZIP, Linear, Trello, Asana, CSV)
- [x] Each source card shows logo/icon, name, description, and optional "Recommended" badge
- [x] Step 2 — Connection: source-specific configuration (OAuth connect for API sources, file upload for ZIP/CSV)
- [x] Import preview showing what entities map to which Lazynext primitives (Pages to DOC, DB rows to TASK, etc.)
- [x] Workflow selector dropdown for target workflow
- [x] Step 3 — Progress: animated spinner, progress bars per entity type (Docs, Tasks, Edges), live log with success/warning/info entries
- [x] Success state with completion summary and "Go to Workflow" / "Import More" CTAs
- [x] Close button (X) in modal header
- [x] Back navigation from Step 2 to Step 1

### Nice to Have
- [x] "Recommended" badge on Notion API source
- [x] Skipped item warnings in the live log (e.g., empty pages)
- [x] "+ Create new workflow" option in the workflow selector

### Out of Scope
- Actual OAuth flow implementation
- Field-level mapping UI for CSV imports
- Partial import / selective page picking
- Import rollback / undo

---

## Layout

| Attribute | Value |
|---|---|
| Page type | Modal overlay |
| Backdrop | Fixed inset-0, bg-black/60, backdrop-blur-sm |
| Modal | max-w-2xl, centered, bg-slate-900, border slate-700, rounded-xl |

### Key Sections
1. **Header** — "Import Your Data" title, subtitle, close button
2. **Step Indicator** — horizontal stepper: circles (1, 2, 3) connected by lines, active step in primary, completed steps in green with checkmark
3. **Step 1: Choose Source** — description text + 2-column grid of 6 source cards
4. **Step 2: Connect** — source icon + name, import preview checklist, workflow selector, CTA button, back link
5. **Step 3: Import** — spinner + status text, 3 progress bars (Docs, Tasks, Edges), live log panel, success state on completion

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| Modal | Entry | scale-in animation (0.95 to 1.0, 200ms ease-out) |
| Step indicator circle | Future | bg-slate-700, text-slate-400 |
| Step indicator circle | Active | bg-primary, text-white |
| Step indicator circle | Completed | bg-green-500, white checkmark |
| Step indicator label | Active | text-primary, font-medium |
| Step indicator label | Completed | text-green-400 |
| Source card | Default | bg-slate-800, border slate-700 |
| Source card | Hover | border-primary/50 (Notion API) or border-slate-600 (others) |
| Source card | Click | Advances to Step 2 with the selected source |
| "Recommended" badge | Static | bg-green-500/10, text-green-400, 9px text |
| Import preview checkmark | Included | bg-green-500/20, text-green-400 |
| Import preview dash | Excluded | bg-slate-700, text-slate-500 |
| Connect CTA | Click | Triggers OAuth or upload flow, then advances to Step 3 |
| Back link | Click | Returns to Step 1, resets step indicator |
| Progress bars | Animating | Width animates from 0% to current progress, 3s ease-out |
| Live log | Streaming | New lines append at bottom; auto-scrolls; color-coded icons (green check, amber warning, gray info) |
| Spinner | Active | Spinning SVG circle in primary color |
| Success state | Visible | Replaces spinner; green checkmark, summary text, two CTA buttons |
| Close button | Click | Dismisses modal (with confirmation if import is in progress) |

---

## Responsive Behavior

| Breakpoint | Adaptation |
|---|---|
| Desktop | max-w-2xl centered modal, 2-column source grid |
| Tablet | Same modal width, source grid remains 2 columns |
| Mobile | Modal goes near-full-screen, source grid becomes 1 column, progress bars stack, log panel height reduced |

---

## Content

| Element | Copy / Data |
|---|---|
| Modal title | Import Your Data |
| Modal subtitle | Bring your existing work into Lazynext |
| Step labels | 1. Choose Source, 2. Connect, 3. Import |
| Source: Notion API | "Connect via OAuth. Imports pages as Docs, databases as Tasks." — Recommended |
| Source: Notion ZIP | "Upload a Notion export ZIP. No OAuth needed." |
| Source: Linear | "Import issues as Tasks with status, priority, and assignee." |
| Source: Trello | "Import boards as workflows, cards as Tasks." |
| Source: Asana | "Import projects as workflows, tasks with subtasks." |
| Source: CSV | "Upload CSV or TSV files. Map columns to Task fields." |
| Import mapping | Pages to DOC nodes, Database rows to TASK nodes (if status/assignee found), Nested pages to Edges, Images/files not imported (yet) |
| Workflow options | Q2 Product Sprint, Client Onboarding, + Create new workflow |
| CTA button | Connect Notion & Start Import |
| Progress labels | Pages (Docs): 12/18, Database rows (Tasks): 24/35, Connections (Edges): 8/12 |
| Log entries | Imported: "Product Roadmap" as DOC; Imported: "Sprint Backlog" 12 tasks; Skipped: "Untitled" (empty page); Created 8 edges from page hierarchy |
| Success summary | 18 docs, 35 tasks, and 12 connections imported |

---

## Constraints

- Modal must not be dismissible during active import (Step 3 in progress) without confirmation
- OAuth popups must work within browser security model (window.open, not iframe)
- File upload for ZIP/CSV must support drag-and-drop and click-to-browse
- Import progress must use real-time updates (WebSocket or SSE)
- Maximum import size: defined by plan limits (nodes count)
- Log panel must be scrollable with max-height constraint (32 lines visible)

---

## References

- Mockup: `docs/features/15-import-modal/mockups/import-modal.html`
- Design system: Inter font, dark theme (slate-950 bg), primary #4F6EF7
- Similar patterns: Notion import wizard, Linear import settings, Asana CSV import
- Lazynext primitives: TASK, DOC, DECISION, EDGE (connections)
