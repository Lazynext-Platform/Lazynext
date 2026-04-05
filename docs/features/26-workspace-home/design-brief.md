# Design Brief — Workspace Home

> **Feature**: 26 — Workspace Home
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: The post-login workspace dashboard showing a personalized welcome, quick stats, workflow cards with progress, recent activity feed, and due-soon items with LazyMind suggestions.
**Why**: Users need an at-a-glance overview of their workspace state after logging in, before diving into a specific workflow canvas.
**Where**: Default landing page at `/workspace/[slug]/` — the first thing users see after login.

---

## Target Users

- **All workspace members**: Need a summary of what needs their attention
- **Managers/leads**: Need overview of team activity and workflow progress
- **Decision makers**: Need visibility into open decisions and decision health score

---

## Requirements

### Must Have
- [x] Welcome section with personalized greeting ("Good morning, Avas")
- [x] 4 quick stat cards: Assigned to you (7), Open Decisions (4), Unread Threads (5), Decision Health (76)
- [x] Workflow grid (3 cards + "Create new" card) with progress bars, node counts, team avatars
- [x] Recent Activity feed (5 items) with user avatars, action descriptions, timestamps
- [x] Due Soon list (4 items) with overdue/upcoming indicators and type badges
- [x] LazyMind suggestion card in Due Soon section
- [x] Sidebar with Home highlighted, workflow list, quick access links
- [x] Top bar with search input, notification bell with badge, user avatar

### Nice to Have
- [x] Color-coded stat card accents (blue, orange, purple, emerald)
- [x] Workflow progress percentage with colored progress bars
- [x] Stacked team avatars on workflow cards
- [x] "Create new workflow" card with dashed border and "or use a template" hint

### Out of Scope
- Customizable dashboard widgets
- Drag-to-reorder dashboard sections
- Time-range filtering for stats
- Pinned/favorited workflows

---

## Layout

**Page type**: Full-page dashboard
**Primary layout**: App shell (sidebar w-60 + top bar h-12) + scrollable main content (max-w-6xl)
**Key sections** (in order):
1. **Welcome**: Greeting + subtitle
2. **Quick Stats**: 4-column grid of stat cards
3. **Workflows**: 3-column grid of workflow cards + create card
4. **Activity + Due Soon**: 2-column grid — recent activity left, due soon right

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | All sections populated with data |
| **Empty workspace** | No workflows — show create prompt (not mocked) |
| **Loading** | Skeleton states for cards and lists (not mocked) |

**Key interactions**:
- Click workflow card to navigate to that canvas
- Click "New Workflow" or create card to start workflow creation
- Click notification bell for notification dropdown
- Click search input to trigger command palette

---

## Responsive Behavior

- **Mobile**: Single column, stat cards 2x2, workflow cards stack, activity/due-soon stack
- **Tablet**: 2-column layouts, sidebar visible
- **Desktop**: Full 4-column stats, 3-column workflows, 2-column bottom

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Greeting** | Dynamic | "Good morning, Avas" (time-based) |
| **Stat values** | Dynamic | 7 assigned, 4 open decisions, 5 unread, 76 health score |
| **Workflow cards** | Dynamic | Name, updated time, node counts, progress %, team avatars |
| **Activity items** | Dynamic | "Raj Kumar completed Fix auth redirect bug — 2 hours ago" |
| **Due items** | Dynamic | Task name + due date with urgency coloring |
| **LazyMind suggestion** | AI-generated | Proactive advice about open decisions |

---

## Constraints

- Decision Health score uses the same 0-100 scale and color coding as Decision DNA
- Due Soon items color-code urgency: red (overdue), orange (tomorrow), yellow (this week)
- LazyMind suggestion card uses blue-500/5 background with blue-500/20 border

---

## References

- Feature 05 (Workflow Canvas) — destination when clicking workflow cards
- Feature 16 (Pulse Dashboard) — deeper analytics accessible from sidebar
- Feature 07 (Decision DNA) — source of Decision Health score
