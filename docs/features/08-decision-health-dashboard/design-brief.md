# Design Brief — Decision Health Dashboard

> **Feature**: 08 — Decision Health Dashboard
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A full-page analytics dashboard showing decision health metrics including quality scores, outcome distributions, trends over time, top decision makers, type breakdowns, tag clouds, and AI-powered insights.
**Why**: Enables teams to measure and improve their decision-making practices with data-driven analytics, turning decisions from invisible work into a measurable competency.
**Where**: Under Decision DNA navigation in the left sidebar, gated to Business plan users.

---

## Target Users
- **Team leads / managers**: Need to assess team decision quality and identify improvement areas
- **Executives / stakeholders**: Need high-level overview of organizational decision patterns
- **Workspace admins**: Need to identify untagged decisions and encourage team accountability

---

## Requirements

### Must Have
- [x] Time range filter (7 days, 30 days, 90 days, All time)
- [x] 4 top stat cards: Total Decisions, Avg Quality Score (with progress bar), Outcomes Tagged %, Decision Velocity (per week)
- [x] Quality Score Distribution horizontal bar chart (3 tiers: 0-39 red, 40-69 amber, 70-100 green)
- [x] Outcome Distribution donut chart with legend (Good, Bad, Neutral, Pending)
- [x] Quality Score Trend line chart (12 weeks, SVG polyline with gradient fill)
- [x] Top Decision Makers table (Member, Decisions count, Avg Quality, Good %)
- [x] Decision Type Breakdown bars (Reversible, Irreversible, Experimental)
- [x] Decisions by Tag cloud (colored pills with counts)
- [x] Untagged Decisions alert banner with actionable "Tag outcome" buttons
- [x] LazyMind AI Insight card with actionable suggestions

### Nice to Have
- [x] Stat card hover lift animation (translateY -2px)
- [x] Animated bar widths with CSS transition (0.8s ease-out)
- [x] "Export Report" button in header
- [x] Business plan badge in header

### Out of Scope
- Real-time data updates (static mockup)
- Drill-down from chart elements to filtered decision lists
- Custom date range picker

---

## Layout

**Page type**: Dashboard / analytics page
**Primary layout**: App shell (sidebar + top bar) with scrollable main content area (max-w-7xl centered)
**Key sections** (in order):
1. **Top bar**: "Decision Health Dashboard" title + Business badge + last updated timestamp + Export Report button
2. **Time range filter**: Pill button group (7d, 30d active, 90d, All time)
3. **Stat cards row**: 4-column grid of metric cards
4. **Charts row**: 2-column grid — Quality Score Distribution (left) + Outcome Distribution donut (right)
5. **Quality trend chart**: Full-width SVG line chart (12 weeks)
6. **Two-column row**: Top Decision Makers table (left) + Decision Type Breakdown bars (right) with insight callout
7. **Tag cloud**: Full-width flex-wrap of colored tag pills
8. **Untagged alert**: Amber warning banner with 3 sample untagged decisions and action buttons
9. **LazyMind insight**: Blue-accented AI insight card with action buttons

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | 30-day period selected, all charts populated with sample data |
| **Empty** | Not mocked — would show empty charts with "No decisions in this period" |
| **Loading** | Bar chart widths animate from 0 to target width on page load |
| **Error** | Not explicitly mocked |
| **Success** | Not applicable — read-only dashboard |

**Key interactions**:
- **Time range toggle**: Click pill buttons to switch period (30 days is default active)
- **Export Report**: Button in top bar header
- **Tag outcome buttons**: Per-row action buttons in the untagged decisions alert
- **View all untagged**: Link at bottom of alert banner
- **LazyMind actions**: "Create hiring template" and "Dismiss" buttons on AI insight card
- **Stat card hover**: Subtle lift effect on hover

---

## Responsive Behavior
- **Mobile**: Stat cards stack to 1 column, charts stack vertically, table scrolls horizontally
- **Tablet**: Stat cards 2 columns (sm:grid-cols-2), charts stack vertically
- **Desktop**: Full 4-column stat grid (lg:grid-cols-4), 2-column chart rows (lg:grid-cols-2)

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Total Decisions** | Numeric + delta | "47" with "+12 from last month" (green) |
| **Avg Quality Score** | Score/100 + progress bar | "74/100" with 74% filled green bar |
| **Outcomes Tagged** | Percentage + CTA | "68%" with "15 untagged" amber link |
| **Decision Velocity** | Rate | "6.2/week" with "+1.3 from last month" |
| **Quality Distribution** | Horizontal bars | 0-39: 3 (6%), 40-69: 14 (30%), 70-100: 30 (64%) |
| **Outcome Donut** | SVG donut chart | Good 21 (45%), Bad 6 (12%), Neutral 5 (11%), Pending 15 (32%) |
| **Trend chart** | SVG polyline | 12-week quality score trend, upward trajectory |
| **Decision makers** | Table rows | Avas Patel (18 decisions, 82 avg, 72% good) through Neha Kapoor (5, 58, 40%) |
| **Type breakdown** | Horizontal bars | Reversible 28 (60%), Irreversible 12 (25%), Experimental 7 (15%) |
| **Tags** | Colored pills | infrastructure (12), product (9), hiring (7), pricing (6), design (5), marketing (4), legal (4) |
| **AI insight** | Paragraph text | Quality improved 18% in 6 weeks, infrastructure up, hiring needs template |

---

## Constraints
- Entire dashboard is gated to Business plan (badge shown in header)
- Charts are static SVG in mockup — implementation will use a charting library
- Decision velocity is calculated as decisions per week over the selected period
- Untagged decisions alert shows decisions older than 30 days with "Pending" outcomes
- LazyMind insight is AI-generated content, not user-editable

---

## References
- Feature 07 (Decision DNA View) for the decision list and health overview card
- Feature 10 (LazyMind AI Panel) for AI insight patterns
- Lazynext design system: stat card pattern, horizontal bar chart pattern, donut chart pattern
