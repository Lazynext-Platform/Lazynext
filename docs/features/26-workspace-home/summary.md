# 📋 Summary — Workspace Home

> **Feature**: #26 — Workspace Home
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The default landing page after login at `/workspace/[slug]/`. Includes a personalized greeting (time-of-day-aware), 4 quick-stat cards (Assigned to you, Open Decisions, Unread Threads, Decision Health), a workflow grid with progress bars + team avatars + "Create new" tile, a recent activity feed, a Due Soon list with overdue indicators, and an inline LazyMind suggestion card.

## Key Decisions

- **Home is a derived view, not a config surface** — Every widget is a query against existing data; users don't customize the layout in v1.0. Avoids the dashboard-builder rabbit hole.
- **Stat cards are clickable filters** — Clicking "Assigned to you" routes to a pre-filtered task view (#37) rather than expanding inline. Keeps the home page scannable.
- **LazyMind suggestion is opt-in via the card** — A single AI-generated suggestion appears as a card; clicking expands it in the LazyMind panel (#10). Users who don't want AI never see anything more than a chip-sized prompt.
- **Decision Health score is the cross-link to #08** — Surfaces the score on home so users notice quality movements without needing to open the dashboard daily.

## Files & Components Affected

- `app/(app)/workspace/[slug]/page.tsx` — Home page
- `components/home/Greeting.tsx`, `QuickStats.tsx`, `WorkflowGrid.tsx`, `ActivityFeed.tsx`, `DueSoon.tsx`, `LazyMindSuggestion.tsx`
- `lib/data/home.ts` — Aggregated query for all home widgets in a single round-trip
- `app/api/v1/home/route.ts`

## Dependencies

- **Depends on**: #05 Workflow Canvas, #07 Decision DNA, #10 LazyMind AI Panel, #38 Activity Feed
- **Enables**: First-impression engagement after every login

## Notes

- The greeting time bucket is server-rendered using the workspace's timezone setting (defaults to user's IST).
- "Create new" workflow tile triggers the same node-graph creation flow used elsewhere; no separate creation flow.
