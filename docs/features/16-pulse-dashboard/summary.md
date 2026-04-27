# 📋 Summary — Pulse Dashboard

> **Feature**: #16 — Pulse Dashboard
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

PULSE — "the status meeting you never have to hold." A full-page sprint dashboard that aggregates: 4 top metric cards (Tasks Done with % + progress, Overdue list, Blocked with unblock CTA, Decisions with avg quality), a per-person workload section with horizontal bars + overload warnings, an SVG burndown chart with ideal vs actual lines, a recent activity timeline, week-over-week comparison, and a **LazyMind weekly summary** auto-generated from the same data.

## Key Decisions

- **PULSE replaces standups, doesn't supplement them** — The page is named to reframe the ritual; the LazyMind summary at top makes it skim-readable in 30 seconds.
- **Burndown is hand-rolled SVG** — Recharts handles cards but the burndown needed precise control over the ideal-vs-actual fill area; ~80 lines of SVG.
- **Workload bars surface overload, not just utilization** — A red badge appears when a person crosses the team-mean + threshold; ICs see themselves in team context.
- **All metrics are workspace-scoped + sprint-aware** — Sprint boundaries come from the workspace's active Pulse window (rolling 14 days by default). No global "all time" view.

## Files & Components Affected

- `app/(app)/workspace/[slug]/pulse/page.tsx` — Pulse page
- `components/pulse/MetricCards.tsx`, `WorkloadBars.tsx`, `Burndown.tsx`, `ActivityTimeline.tsx`, `WeeklySummary.tsx`
- `lib/data/pulse.ts` — Aggregation queries (per-person task counts, burndown buckets, decision quality avg)
- `app/api/v1/pulse/route.ts` — Aggregated metrics endpoint
- `lib/ai/prompts.ts` — LazyMind weekly-summary prompt template

## Dependencies

- **Depends on**: #05 Workflow Canvas, #07 Decision DNA View, #10 LazyMind AI Panel, #34 Team Member Management
- **Enables**: Workspace Home (#26) embeds a compact Pulse widget

## Notes

- Burndown points are computed from task `created_at`/`completed_at` timestamps — no separate sprint snapshot table.
- The LazyMind summary is regenerated on demand (cached for 1 hour per workspace) to keep AI costs bounded.
