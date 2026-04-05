# Design Spec — Public Shared Canvas

> **Feature**: 35 — Public Shared Canvas
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A public read-only canvas view showing 5 nodes (Task, Decision, Doc, Thread, Pulse) with edges, a branded top bar with read-only indicator and sign-up CTA, a share link management modal, zoom controls, and a "Built with Lazynext" watermark footer.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Read-only badge uses amber (warning color) to clearly communicate non-editable state; watermark uses subtle backdrop-blur pill to avoid canvas obstruction while maintaining brand presence; share modal shows view analytics to demonstrate link value; "Sign up free" CTA in top bar for conversion.

---

## Section Breakdown

### Top Bar
**Purpose**: Identify the shared canvas and provide conversion CTA
**Layout**: h-12 bg-slate-900 border-b border-slate-700, flex justify-between
**Key elements**: Lazynext logo (w-7), workflow name ("Q2 Product Sprint"), sharing workspace ("Shared by Acme Corp"), read-only badge (amber dot + text), stats ("5 nodes · Last updated Apr 3"), "Sign up free" button (bg-[#4F6EF7])
**Rationale**: Top bar provides context without cluttering the canvas. CTA drives sign-ups from impressed viewers.

### Canvas with Nodes
**Purpose**: Display the full workflow read-only
**Layout**: Full viewport minus top bar, grid background
**Key elements**: 5 node types rendered with full data — Task (blue, status, assignee), Decision (orange border, quality score 84, outcome badges), Doc (emerald, description, last updated), Thread (purple, message count, participants), Pulse (cyan, average score, votes). Solid edges connecting nodes.
**Rationale**: Showing real data in nodes demonstrates platform value to external viewers.

### Share Link Modal
**Purpose**: Manage the public share link (shown for admin context)
**Layout**: w-80 bg-slate-900 rounded-xl, positioned top-right
**Key elements**: "Share this canvas" header, public link active badge (emerald), URL code block with Copy button, "Anyone with the link can view" with toggle, view count (142) + creation date
**Rationale**: Modal shows link management from the owner's perspective. View count validates sharing effort.

### Watermark Footer
**Purpose**: Brand attribution and conversion
**Layout**: Fixed bottom-4 center, bg-slate-900/80 backdrop-blur-sm rounded-full pill
**Key elements**: Lazynext mini logo, "Built with Lazynext" text, "Try it free →" link (brand blue)
**Rationale**: Subtle enough to not obstruct content, prominent enough for brand attribution and conversion.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Public view** | Read-only canvas, no auth required | Default visitor state |
| **Share active** | Green badge, link copyable | Toggle on |
| **Share disabled** | Link returns 404 | Toggle off |
| **Hover node** | Cursor default (not pointer) | Reinforces read-only |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Top bar simplified (no stats), nodes in scrollable view, watermark at bottom |
| **Tablet (640–1024px)** | Full canvas with zoom controls |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Accessibility Notes

- **Contrast**: White text on slate-900 meets AA. Amber read-only badge provides clear status.
- **Focus order**: Top bar CTA → zoom controls → watermark CTA
- **Screen reader**: Read-only badge needs aria-label. Nodes need descriptive text. Canvas needs landmark.
- **Keyboard**: Tab to interactive elements (CTA buttons, zoom, share modal controls).

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Watermark pill component | New pattern for public views | Consider adding for shared/embed views |
