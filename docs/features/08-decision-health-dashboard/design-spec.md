# Design Spec — Decision Health Dashboard

> **Feature**: 08 — Decision Health Dashboard
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: A comprehensive analytics dashboard for decision health, featuring stat cards, quality distribution bars, outcome donut chart, 12-week trend line, top decision makers leaderboard, type breakdown, tag cloud, untagged decisions alert, and AI-powered insight card.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Dashboard uses a single-scroll vertical layout rather than a grid of widgets. AI insight is positioned last to serve as a summary/call-to-action after the user has absorbed the data. Untagged decisions alert is prominent (amber) to drive outcome tagging behavior.

---

## Section Breakdown

### Top Bar
**Purpose**: Page title and actions
**Layout**: Sticky header (h-12), bg-slate-900, flex between title and actions
**Key elements**:
- "Decision Health Dashboard" title (text-sm, font-semibold)
- "Business" badge (orange pill)
- "Last updated: 2 min ago" timestamp
- "Export Report" button (slate-800 bg)
**Rationale**: Business badge reinforces plan tier; timestamp builds confidence in data freshness

### Time Range Filter
**Purpose**: Control the data period for all dashboard metrics
**Layout**: Horizontal button group with pill styling
**Key elements**:
- 4 period buttons: 7 days, 30 days (active, primary blue bg), 90 days, All time
**Rationale**: Simple toggle rather than date picker reduces friction; 30 days is a sensible default for decision-making cadence

### Stat Cards Row
**Purpose**: Key metrics at a glance
**Layout**: 4-column responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
**Key elements**:
- Total Decisions: "47" with green delta "+12 from last month"
- Avg Quality Score: "74/100" with green progress bar (74% width)
- Outcomes Tagged: "68%" with amber "15 untagged" CTA link
- Decision Velocity: "6.2/week" with green delta "+1.3 from last month"
**Rationale**: Four metrics cover volume, quality, completeness, and pace — the four dimensions of healthy decision-making

### Quality Score Distribution
**Purpose**: Show distribution of decision quality across tiers
**Layout**: Card with 3 horizontal bars, labels left, percentage right
**Key elements**:
- 0-39 (red): 3 decisions, 6%
- 40-69 (amber): 14 decisions, 30%
- 70-100 (green): 30 decisions, 64%
- Helper text: "Most decisions are high quality. Consider reviewing the 3 low-score decisions."
**Rationale**: Horizontal bars are easier to compare than vertical; inline counts inside bars maximize density

### Outcome Distribution Donut
**Purpose**: Show proportion of decision outcomes
**Layout**: Card with SVG donut chart (centered) + legend (right)
**Key elements**:
- SVG donut with 4 segments: Good (green, 45%), Bad (red, 12%), Neutral (gray, 11%), Pending (gray-400, 32%)
- Center text: "47 total"
- Legend: colored dots with labels and counts
**Rationale**: Donut chart provides immediate visual proportion; center number reinforces total

### Quality Score Trend
**Purpose**: Show quality trajectory over time
**Layout**: Full-width card with SVG line chart, Y-axis labels, X-axis week labels
**Key elements**:
- SVG polyline (stroke #4F6EF7, 2.5px) with gradient area fill below
- Y-axis: 0, 25, 50, 75, 100
- X-axis: W1 through W12
- Data points as small circles
- Helper text: "Quality scores are trending upward"
**Rationale**: Line chart shows trajectory clearly; gradient fill adds visual weight to the improvement trend

### Top Decision Makers
**Purpose**: Leaderboard of team members by decision activity and quality
**Layout**: Card with table (4 columns)
**Key elements**:
- Columns: Member (avatar + name), Decisions count, Avg Quality (color-coded), Good %
- 4 rows: Avas Patel, Priya Sharma, Raj Kumar, Neha Kapoor
**Rationale**: Table format enables comparison across multiple dimensions; color-coded quality scores provide instant assessment

### Decision Type Breakdown
**Purpose**: Show proportion of decision types
**Layout**: Card with 3 horizontal progress bars + insight callout
**Key elements**:
- Reversible: 28 (60%, blue bar)
- Irreversible: 12 (25%, orange bar)
- Experimental: 7 (15%, purple bar)
- Insight box: "25% of decisions are irreversible but only average 71 quality. Consider adding extra review."
**Rationale**: Type breakdown reveals risk profile; insight box makes the data actionable

### Tags Cloud
**Purpose**: Show decision categorization distribution
**Layout**: Full-width card with flex-wrap pills
**Key elements**:
- 7 colored tag pills: infrastructure (12, blue), product (9, green), hiring (7, purple), pricing (6, orange), design (5, rose), marketing (4, cyan), legal (4, amber)
**Rationale**: Tag cloud provides quick categorization overview; colors match tag identity across the app

### Untagged Decisions Alert
**Purpose**: Drive users to tag outcomes for decisions older than 30 days
**Layout**: Amber-themed card with warning icon, description, and 3 sample decisions with action buttons
**Key elements**:
- Warning icon (amber circle with "!") + "15 Decisions Need Outcome Tags" heading
- 3 sample rows: decision title, age ("62 days ago"), "Tag outcome" button
- "View all 15 untagged decisions" link
**Rationale**: Prominent alert drives behavior change; showing specific decisions with ages creates urgency

### LazyMind AI Insight
**Purpose**: AI-generated summary and recommendations
**Layout**: Card with blue border accent, sparkle icon, insight paragraph, action buttons
**Key elements**:
- Sparkle icon in blue circle + "LazyMind Insight" heading
- Paragraph: quality improved 18%, infrastructure decisions improved most, hiring decisions below average
- Action buttons: "Create hiring template" (blue) + "Dismiss" (slate)
**Rationale**: AI insight synthesizes dashboard data into actionable recommendations; positioned last as the summary takeaway

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | 30-day period selected, all sections populated | Dashboard is read-only |
| **Period change** | All metrics and charts update to selected period | 7d / 30d / 90d / All time |
| **Hover on stat card** | Card lifts 2px (translateY) | Subtle interaction feedback |
| **Bar animation** | Bars animate from 0 to target width on load | 0.8s ease-out CSS transition |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Stat cards: 1 column, charts: full width stacked, table: horizontal scroll, donut + legend stack vertically |
| **Tablet** (640-1024px) | Stat cards: 2 columns (sm:grid-cols-2), charts: full width stacked, table fits within card |
| **Desktop** (> 1024px) | Stat cards: 4 columns (lg:grid-cols-4), charts: 2-column grid (lg:grid-cols-2), full table layout |

---

## Cognitive Load Assessment
- **Information density**: High — dashboard contains 9 distinct sections with multiple data points, but vertical scrolling and clear section headers prevent overwhelm
- **Visual hierarchy**: Strong — stat cards at top provide key numbers, charts in middle provide depth, alerts and AI insight at bottom drive action
- **Progressive disclosure**: Moderate — all data is visible on scroll; no expandable/collapsible sections needed given the read-only nature
- **Interaction complexity**: Very low — only the time period toggle and action buttons are interactive; dashboard is primarily for consumption

---

## Accessibility Notes
- **Contrast**: Green/amber/red on dark backgrounds maintain sufficient contrast; progress bars have sufficient contrast against slate-800 tracks
- **Focus order**: Time period buttons > stat cards > chart sections > table rows > alert action buttons > AI insight buttons
- **Screen reader**: Bar chart values include counts and percentages in text; donut chart legend provides text equivalents; stat cards use uppercase tracking for labels
- **Keyboard**: All buttons are standard button elements; time period toggle uses button group; table is navigable

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| SVG donut chart | Custom visualization not in design system | Yes — add chart patterns |
| SVG line chart with gradient fill | Custom visualization | Yes — add chart patterns |
| Amber alert banner pattern | Decision-specific untagged alert | Yes — add alert banner component |
| None significant | Layout follows standard card + grid patterns | No |
