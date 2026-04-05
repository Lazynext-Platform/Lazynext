# Design Spec — Workspace Home

> **Feature**: 26 — Workspace Home
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A post-login workspace dashboard with personalized greeting, 4 stat cards, 3 workflow cards with progress, a recent activity timeline, due-soon list, and LazyMind suggestion — all within the standard app shell.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Dashboard as the first view (not a canvas) to provide orientation; Decision Health score as a top-level stat to reinforce the Decision DNA differentiator; LazyMind suggestion embedded in due-soon section for contextual AI value.

---

## Section Breakdown

### Quick Stats Row
**Purpose**: At-a-glance workspace health metrics
**Layout**: 4-column grid with equal-width cards (bg-slate-900 border-slate-700 rounded-xl p-4)
**Key elements**: Metric label (text-[10px] uppercase), value (text-2xl font-bold), detail line with colored accent
**Rationale**: Four metrics cover the key dimensions: work (tasks), decisions, communication (threads), and overall health. Decision Health being a top-level stat reinforces the platform's differentiator.

### Workflow Cards
**Purpose**: Quick access to active workflows with progress context
**Layout**: 3-column grid + dashed create card
**Key elements**: Color dot icon, name, updated time, node counts (Tasks/Docs/Decisions), progress bar, completion percentage, stacked team avatars
**Rationale**: Progress bars provide instant visual status. Node count breakdown shows workflow composition. Team avatars show who's involved.

### Recent Activity
**Purpose**: Timeline of recent workspace events
**Layout**: Left column of 2-column bottom section, bg-slate-900 card
**Key elements**: 5 activity items with user avatar, action text, entity links (colored by type), timestamp with workflow context
**Rationale**: Activity feed keeps users informed without requiring them to visit each workflow. LazyMind events mixed in normalizes AI as a team member.

### Due Soon
**Purpose**: Urgent items requiring attention
**Layout**: Right column, bg-slate-900 card with stacked items + LazyMind suggestion
**Key elements**: 4 items with urgency dots (red/orange/yellow), task/decision labels, due dates, type badges; LazyMind suggestion card (bg-blue-500/5 border-blue-500/20)
**Rationale**: Urgency color coding (red=overdue, orange=tomorrow) enables instant triage. LazyMind suggestion adds proactive AI value at the moment of relevance.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | All sections populated | First view after login |
| **Empty workspace** | No workflows — CTA to create first | Not mocked |
| **Loading** | Skeleton cards and list items | Not mocked |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Stats 2x2, workflows single column, activity/due stack vertically |
| **Tablet (640–1024px)** | Stats 4-col, workflows 2-col, bottom 2-col |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Cognitive Load Assessment

- **Information density**: Medium — dashboard is information-rich but well-sectioned
- **Visual hierarchy**: Clear — stats → workflows → activity/due flows naturally top-to-bottom
- **Progressive disclosure**: Dashboard is overview; clicking leads to detailed views
- **Interaction complexity**: Low — click to navigate, no complex interactions on this page

---

## Accessibility Notes

- **Contrast**: Stat values in white on dark background meet AA. Colored accent text provides additional meaning.
- **Focus order**: Search input → bell → avatar → stat cards → workflow cards → activity items → due items
- **Screen reader**: Stat cards need aria-label with full context. Activity items should be a list.
- **Keyboard**: All cards and items should be focusable and activatable via Enter.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing card, badge, and layout patterns | No |
