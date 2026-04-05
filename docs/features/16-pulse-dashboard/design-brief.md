# Design Brief — Pulse Dashboard

> Feature: 16 — Pulse Dashboard
> Date: 2026-04-05
> Target Fidelity: Mockup

---

## Overview

**What:** PULSE is Lazynext's status dashboard — "the status meeting you never have to hold." It aggregates sprint health metrics, team workload distribution, sprint burndown progress, a recent activity timeline, week-over-week comparisons, and an AI-generated LazyMind weekly summary into a single scrollable page.

**Why:** Status meetings waste time because the data already exists in the system. PULSE surfaces that data automatically, giving team leads and ICs a real-time pulse on sprint health without a meeting. The LazyMind summary synthesizes the data into actionable prose, highlighting risks (overdue tasks, workload imbalance, blocked items) that would otherwise surface too late.

**Where:** Full-page view accessible from the sidebar (PULSE nav item with chart icon). Uses the standard sidebar + top-bar layout with a scrollable content area.

---

## Target Users

| Persona | Goal |
|---|---|
| Team Lead / PM | Get a quick read on sprint health without holding a standup |
| IC / Developer | See their own workload in context of the team |
| Workspace Admin | Monitor overall velocity and decision quality |
| Stakeholder | Check progress asynchronously without interrupting the team |

---

## Requirements

### Must Have
- [x] Top metric cards row: Tasks Done (with % complete + progress bar), Overdue (with task list), Blocked (with unblock CTA), Decisions (with avg quality score)
- [x] Team Workload section: horizontal bars per person showing active task count, with completion count and overload warning
- [x] Sprint Progress: burndown chart (SVG polyline) with ideal line, actual line, area fill, and legend
- [x] Recent Activity timeline: vertical timeline with color-coded event types (task completion, decision logged, doc update, task started, comment)
- [x] Week-over-week comparison: 4-column grid showing Tasks Completed, Decisions Logged, Docs Updated, Threads Active with up/down/equal indicators
- [x] LazyMind Weekly Summary: AI-generated prose paragraph with risk callouts and "Send as Monday digest" CTA

### Nice to Have
- [x] Workflow selector dropdown in the top bar
- [x] Auto-refresh indicator ("Auto-refreshes every 5 min")
- [x] "Customize" button in top bar
- [x] Overload warning callout in workload section ("Priya has 8 active tasks, team avg 5.25")
- [x] "Log decision to unblock" CTA in blocked card
- [x] "View full activity log" link at bottom of activity timeline

### Out of Scope
- Custom dashboard builder / drag-and-drop widgets
- Historical trend charts beyond current sprint
- Individual contributor view (personal dashboard)
- Export to PDF / Slack integration

---

## Layout

| Attribute | Value |
|---|---|
| Page type | Full-page dashboard |
| Primary layout | Single-column stacked sections, max-w-7xl |
| Sidebar | Standard app sidebar with PULSE highlighted (cyan accent) |
| Top bar | Sticky (z-10), chart icon + "PULSE" title + tagline, workflow selector, auto-refresh indicator, Customize button |

### Key Sections (top to bottom)
1. **Metric Cards** — 4-column grid (lg:grid-cols-4, grid-cols-2): Tasks Done, Overdue, Blocked, Decisions
2. **Team Workload** — Full-width card with horizontal bar chart per person
3. **Two-Column Row** — Sprint Progress (burndown SVG) | Recent Activity (timeline)
4. **Week vs Week** — Full-width card with 4-column comparison grid
5. **LazyMind Summary** — Full-width card with AI sparkle icon, prose paragraph, and CTA button

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| Metric cards | Default | bg-slate-900, border slate-700; hover lifts card (translateY -2px + shadow) |
| Overdue card | Alert | border-red-500/20, red accent color on count and task list |
| Blocked card | Warning | border-amber-500/20, amber accent; includes "Log decision to unblock" link |
| Workload bars | Animated | Width transitions over 800ms ease-out |
| Workload warning | Alert | Amber callout box when any team member exceeds 150% of team average |
| Burndown chart | Static | SVG polyline with ideal dashed line, actual solid line, gradient area fill |
| Activity timeline | Default | Vertical line connector, color-coded event icons |
| Week comparison | Up | Green up-arrow + higher number |
| Week comparison | Down | Red down-arrow + lower number |
| Week comparison | Equal | Gray equals sign |
| LazyMind summary | Default | Primary/30 border highlight; sparkle icon; "Send as Monday digest" CTA |
| Workflow selector | Change | Refreshes all dashboard data for selected workflow |
| Customize button | Click | Opens customization panel (not designed yet) |

---

## Responsive Behavior

| Breakpoint | Adaptation |
|---|---|
| Desktop (lg+) | 4-column metric cards, 2-column middle row (burndown + activity side by side), 4-column week comparison |
| Tablet (md) | 2-column metric cards (2 rows), middle row stacks to single column, 4-column week comparison maintained |
| Mobile (<md) | 2-column metric cards, all sections single column, burndown chart maintains aspect ratio, activity timeline simplified |

---

## Content

| Element | Copy / Data |
|---|---|
| Page title | PULSE |
| Tagline | The status meeting you never have to hold |
| Tasks Done | 18/34 (53%), up 23% |
| Overdue | 3 tasks: Fix auth redirect bug (-2d), Update API docs (-1d), Design review (-3d) |
| Blocked | 1 task: API integration (no decision logged) |
| Decisions | 8 total, avg quality 78, 2 pending outcomes, up 12% |
| Team workload | Avas Patel: 6 tasks (3 done), Priya Sharma: 8 tasks (High warning), Raj Kumar: 3 tasks (2 done), Neha Kapoor: 4 tasks (1 done) |
| Workload alert | "Priya has 8 active tasks (team avg: 5.25). Consider rebalancing." |
| Sprint burndown | 34 total tasks, 7 weeks, currently at week 6 (~16 remaining), 3 weeks left |
| Activity entries | Avas completed task (2h), Priya logged decision (5h, quality 84), Raj updated doc (8h, +340 words), Neha started task (1d), Priya commented (1d), Avas tagged outcome (2d) |
| Week vs week | Tasks: 7 vs 5 (up), Decisions: 3 vs 2 (up), Docs: 4 vs 4 (equal), Threads: 6 vs 9 (down) |
| LazyMind summary | "Good sprint velocity this week. Your team completed 7 tasks (up 40%). The main risk is Priya's workload — she has 8 tasks vs the team average of 5.25. The blocked API integration task has been stuck for 3 days without a decision. Recommend logging a decision to unblock it." |
| Digest CTA | Send as Monday digest |

---

## Constraints

- Dashboard must load within 2 seconds (data can be cached, refresh on 5-min interval)
- Burndown chart uses inline SVG (not a charting library) to minimize bundle size
- All metric data must be derivable from existing Lazynext primitives (TASK, DECISION, DOC, THREAD, EDGE)
- LazyMind summary is generated server-side via AI; must handle loading/error states gracefully
- Workload bars must accommodate variable team sizes (2-20 members) without layout breaking
- Workflow selector must filter all sections to the selected workflow context

---

## References

- Mockup: `docs/features/16-pulse-dashboard/mockups/pulse-dashboard.html`
- Design system: Inter font, dark theme (slate-950 bg), primary #4F6EF7, cyan accent for PULSE branding
- Inspiration: Linear Insights, Jira dashboards, Notion team analytics, GitHub pulse
- PULSE sidebar icon: chart emoji with cyan highlight
