# Design Spec — Pulse Dashboard

> Feature: 16 — Pulse Dashboard
> Date: 2026-04-05
> Fidelity: Mockup
> Status: Draft
> Iterations: 1

---

## Overview

**What was designed:** A full-page status dashboard (PULSE) containing five data sections — metric cards, team workload bars, sprint burndown chart, activity timeline, week-over-week comparison — plus an AI-generated LazyMind summary, all within the standard sidebar + top-bar shell.

**Design brief:** `docs/features/16-pulse-dashboard/design-brief.md`

**Key design decisions:**
1. Dashboard uses a single scrollable column (max-w-7xl) rather than a grid/widget layout — keeps information hierarchy clear and avoids the "too many charts" problem.
2. Metric cards at top provide instant "glance" data — four numbers that answer "are we on track?" in under 3 seconds.
3. Burndown chart uses raw SVG (polyline + gradient fill) instead of a charting library — keeps the page lightweight and avoids dependency bloat.
4. LazyMind summary at the bottom synthesizes all the data above into plain English — this is the "so what?" that makes PULSE more than a dashboard.

---

## Section Breakdown

### 1. Top Metric Cards

**Purpose:** Provide instant high-level sprint health indicators.

**Layout:** 4-column grid (grid-cols-2 lg:grid-cols-4, gap-4). Each card: bg-slate-900, border slate-700 (or colored border for alert states), rounded-lg, p-4.

**Key elements:**

| Card | Value | Accent | Special Elements |
|---|---|---|---|
| Tasks Done | 18/34 (53%) | Green up-arrow (+23%) | Progress bar (h-1.5, green-500) |
| Overdue | 3 | Red warning icon | 3 overdue task names with days-overdue in red text |
| Blocked | 1 | Amber dot | Blocked task name + "Log decision to unblock" link in primary |
| Decisions | 8 | Green up-arrow (+12%) | Avg quality 78 with mini progress bar + "2 pending outcomes" |

- Cards have hover effect: translateY(-2px) + box-shadow
- Overdue card: border-red-500/20
- Blocked card: border-amber-500/20

**Rationale:** Four cards map to the four health dimensions — progress, risk (overdue), blockers, and decision quality. Color-coded borders and icons enable sub-second scanning. The Blocked card includes an inline CTA because unblocking requires a specific action (logging a decision).

---

### 2. Team Workload

**Purpose:** Visualize active task distribution across team members and flag imbalances.

**Layout:** Full-width card (bg-slate-900, border slate-700, rounded-lg, p-5). Title row + space-y-3 list of person rows + optional amber alert callout.

**Key elements per person row:**
- Avatar circle: w-7 h-7, colored bg, 10px white initials
- Name: xs text-slate-300, w-24 fixed width
- Bar: flex-1, bg-slate-800 track (h-5, rounded-full), colored fill bar with embedded "N tasks" label
- Status: 10px right-aligned (done count or "High" warning in red)

| Person | Tasks | Bar Color | Status |
|---|---|---|---|
| Avas Patel (AP) | 6 | blue-500 (55%) | 3 done |
| Priya Sharma (PS) | 8 | red-500 (73%) | High warning |
| Raj Kumar (RK) | 3 | emerald-500 (27%) | 2 done |
| Neha Kapoor (NK) | 4 | rose-400 (36%) | 1 done |

- Overload alert: amber-500/5 bg, amber-500/15 border, amber-400 text: "Priya has 8 active tasks (team avg: 5.25). Consider rebalancing."

**Rationale:** Horizontal bars make task count comparison intuitive. Red bar + "High" label for Priya provides immediate visual alarm. The alert callout is data-driven (auto-triggers when any member exceeds 150% of team average) — reduces the need for manual workload reviews.

---

### 3. Sprint Progress (Burndown)

**Purpose:** Show sprint velocity against the ideal burndown line.

**Layout:** Left column of a 2-column grid (lg:grid-cols-2). Card with h-40 SVG chart area + legend below.

**Key elements:**
- Y-axis labels: 34, 25, 17, 8, 0 (left side, 9px text)
- X-axis labels: W1 through Now (bottom, 9px text)
- Grid lines: 4 horizontal border-b lines (slate-800/50)
- Ideal line: dashed, stroke #334155, from top-left to bottom-right
- Actual burndown: solid polyline, stroke #4F6EF7, 2.5px width, rounded joins
- Area fill: linear gradient from primary/20 at top to primary/0 at bottom
- Current point: circle r=4, fill primary
- Legend: "Actual" (solid primary line) + "Ideal" (dashed slate line) + "16 tasks remaining, 3 weeks left"

**Rationale:** Burndown chart is the standard sprint health visualization. The gradient area fill adds visual weight to the "work remaining" space. Dashed ideal line provides the benchmark. SVG is hand-crafted to avoid chart library dependency.

---

### 4. Recent Activity

**Purpose:** Provide a chronological feed of team actions for asynchronous awareness.

**Layout:** Right column of the 2-column grid. Card with vertical timeline (absolute left-3 line, w-px bg-slate-800). Space-y-3 list of event items.

**Key elements per event:**
- Icon circle: w-6 h-6, colored bg per event type, 10px icon
- Text: xs slate-300, bold names and entity titles
- Timestamp: 10px slate-500, with optional context (quality score, word count, quote)

| Event | Icon Color | Detail |
|---|---|---|
| Task completed | green-500/20 | "Avas completed Fix auth redirect bug" — 2h ago |
| Decision logged | orange-500/20 | "Priya logged decision Use Neon vs Supabase?" — 5h ago, Quality 84 |
| Doc updated | green-500/20 | "Raj updated Product Requirements Doc" — 8h ago, +340 words |
| Task started | blue-500/20 | "Neha started Design landing page" — 1d ago |
| Comment | purple-500/20 | "Priya commented on API integration" — 1d ago, with quote |
| Outcome tagged | green-500/20 | "Avas tagged outcome Good on Use Clerk vs Auth0" — 2d ago |

- "View full activity log" link at bottom (primary color, hover underline)

**Rationale:** Timeline format provides natural chronological flow. Color-coded icons match the entity-type palette used across the app. Contextual details (quality scores, word counts) add signal without requiring click-through.

---

### 5. This Week vs Last Week

**Purpose:** Show directional trends across key activity metrics.

**Layout:** Full-width card. 4-column grid (grid-cols-2 md:grid-cols-4, gap-4). Each cell: text-center with metric label, current value + trend indicator, and comparison text.

**Key elements:**

| Metric | This Week | Last Week | Trend |
|---|---|---|---|
| Tasks Completed | 7 | 5 | Green up-arrow |
| Decisions Logged | 3 | 2 | Green up-arrow |
| Docs Updated | 4 | 4 | Gray equals sign |
| Threads Active | 6 | 9 | Red down-arrow |

- Labels: 10px uppercase slate-500
- Values: xl bold
- Trend arrows: sm colored text (green-400 up, red-400 down, slate-400 equal)
- Comparison: 10px slate-500 "vs N last week"

**Rationale:** Week-over-week is the simplest meaningful time comparison. Four metrics map to the four core activity types. Directional arrows enable pattern recognition without reading numbers.

---

### 6. LazyMind Weekly Summary

**Purpose:** Synthesize all dashboard data into actionable natural language with AI.

**Layout:** Full-width card (bg-slate-900, border-primary/30). Flex row: sparkle avatar (w-8 h-8, primary/20 bg, amber sparkle) + content block (title + paragraph + CTA).

**Key elements:**
- Title: "LazyMind Weekly Summary" — sm semibold text-primary
- Paragraph: sm text-slate-300 with bold callouts for risks ("Priya's workload", "blocked API integration")
- CTA button: "Send as Monday digest" — xs, primary/10 bg, text-primary, rounded-md

**Rationale:** The summary card transforms raw data into a narrative. Bold callouts draw attention to the two risks identified. "Send as Monday digest" makes the summary actionable — replacing the need for a status email.

---

## States

| Component | State | Visual Treatment |
|---|---|---|
| Metric card | Default | bg-slate-900, border slate-700 |
| Metric card | Hover | translateY(-2px), shadow-lg, 150ms transition |
| Metric card (Overdue) | Alert | border-red-500/20 |
| Metric card (Blocked) | Warning | border-amber-500/20 |
| Workload bar | Animated | Width transitions over 800ms ease-out |
| Workload (High) | Alert | Red bar color + "High" label in red |
| Workload alert | Visible | Amber callout when imbalance detected |
| Burndown current point | Static | Solid primary circle at latest data point |
| Activity event | Default | Static timeline items |
| Activity link | Hover | Underline decoration |
| Week trend (up) | Positive | Green up-arrow |
| Week trend (down) | Negative | Red down-arrow |
| Week trend (equal) | Neutral | Gray equals sign |
| LazyMind card | Default | Primary/30 border (elevated importance) |
| Digest CTA | Default | primary/10 bg |
| Digest CTA | Hover | primary/20 bg |
| Dashboard | Loading | Skeleton cards with pulse animation (not shown in mockup) |
| Dashboard | Error | Error banner with retry button (not shown in mockup) |

---

## Responsive Behavior

| Breakpoint | Component | Behavior |
|---|---|---|
| lg (1024px+) | Metric cards | 4 columns |
| lg | Sprint + Activity | 2-column side by side |
| lg | Week comparison | 4 columns |
| md (768–1023px) | Metric cards | 2 columns (2 rows) |
| md | Sprint + Activity | Stack to single column |
| md | Week comparison | 4 columns (maintained) |
| <md (<768px) | Metric cards | 2 columns |
| <md | All sections | Single column |
| <md | Burndown chart | Maintains aspect ratio, labels may overlap (needs testing) |
| <md | Workload bars | Name label width reduced, text may truncate |
| <md | Week comparison | 2 columns |

---

## Cognitive Load Assessment

**Information density:** High — this is a dashboard with 6 distinct data sections. Mitigated by clear section boundaries, progressive vertical scanning, and the LazyMind summary that synthesizes everything at the bottom.

**Scanning pattern:** Top-to-bottom. Metric cards provide the "headline" in 3 seconds. Team workload and burndown provide the "story." Activity timeline provides the "details." LazyMind summary provides the "so what?"

**Color usage:** Extensive but systematic — green for positive/success, red for overdue/negative, amber for warnings/blocked, blue/primary for neutral data and CTAs, purple for comments/threads. Consistent with the rest of the app.

**Cognitive load rating:** 3.5/5 — inherently dense for a dashboard, but the vertical layout with clear section headings and the AI summary at the end make it manageable. Users are not expected to read every section on every visit — the metric cards at top serve as a filter ("do I need to scroll down?").

---

## Accessibility Notes

- Metric cards should use semantic headings (h3) with `aria-label` describing the metric and value
- Progress bars require `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Burndown SVG chart needs `role="img"` and `aria-label` summarizing the chart ("Sprint burndown: 18 of 34 tasks completed, 16 remaining, 3 weeks left")
- Activity timeline events should be a list (`<ul>`) with timestamps in `<time>` elements
- Trend arrows (up/down/equal) must not rely on color alone — include `aria-label` ("up 40%", "down 33%", "unchanged")
- Workload "High" warning uses both color (red) and text label
- LazyMind summary is plain text — fully accessible to screen readers
- Auto-refresh should not disrupt screen reader focus or announce unnecessarily

---

## Design System Deviations

| Deviation | Reason |
|---|---|
| PULSE sidebar item uses cyan accent (cyan-400 / cyan-500/10) instead of primary blue | PULSE has its own brand color within the app to distinguish it as a distinct feature area |
| Burndown chart is hand-crafted SVG, not a charting component | Avoids charting library dependency; acceptable for a single chart type, but would need a chart component if more visualizations are added |
| Metric cards use different border colors (red, amber) for alert states | Alert borders are data-driven, not design system tokens; should be formalized as alert-border-red and alert-border-amber tokens |
| Team workload bars embed text labels inside the bar fills | Non-standard pattern; works at current bar heights (h-5) but may need adjustment for shorter bars or longer names |
| Tagline in top bar ("The status meeting you never have to hold") is marketing copy in a nav element | Acceptable for feature branding; should be hidden on mobile to save space |
