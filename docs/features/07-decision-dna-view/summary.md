# 📋 Summary — Decision DNA View

> **Feature**: #07 — Decision DNA View
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The global decision log — a workspace-scoped page where every recorded decision is searchable, filterable, and sortable. Includes the `Log Decision` modal (quality scoring inputs + options-considered list), quality-score progress bars on each row, outcome badges (Good / Bad / Neutral / Pending), and a compact health overview that links to the full dashboard (#08).

## Key Decisions

- **First-class navigation entry** — `Decisions` lives in the top nav and left sidebar, not buried inside settings or the canvas. Decision DNA is the product's hero differentiator and must feel like a primary surface.
- **Quality score is computed, not entered** — The score derives from inputs the user provides in the log modal (reversibility, options considered, rationale length, stakeholder count) rather than a free-text 0-100 slider. Prevents inflation and gives the score real meaning.
- **Status icons distinguish Decided vs Open** — Green checkmark vs amber clock; both are valid states and both must be browsable.
- **Outcome tagging is post-hoc** — A decision is logged with `Pending` outcome and tagged Good/Bad/Neutral later via the Outcome Review feature (#36). This separation drives the learning loop.

## Files & Components Affected

- `app/(app)/workspace/[slug]/decisions/page.tsx` — Decision log page
- `components/decisions/DecisionList.tsx` — Filter bar, sort, pagination, decision rows
- `components/decisions/LogDecisionModal.tsx` — Modal for creating a new decision with quality inputs
- `components/decisions/QualityScoreBadge.tsx` — Score circle/bar component reused across views
- `lib/db/schema/decisions.ts` — Decision row type with `quality_score`, `outcome`, `decision_type` columns
- `app/api/v1/decisions/` — REST endpoints for list/create/update

## Dependencies

- **Depends on**: #05 Workflow Canvas (shares the node data model — a decision can also exist as a canvas node), #09 Node Detail Panels (Decision panel is the editor)
- **Enables**: #08 Decision Health Dashboard, #36 Decision Outcome Review

## Notes

- Search is currently a `ilike` against title + resolution; full-text search index is a follow-up if performance becomes an issue at scale.
- Date-range and tag filters use URL params so views are shareable.
