# 📋 Summary — Empty & Error States

> **Feature**: #20 — Empty & Error States
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A library of 12 reusable state components covering every place the user could meet an empty surface or a disruption: **6 empty states** (Canvas, Decisions, Search, Tasks, Thread, PULSE), **3 error states** (General Error with auto-reported notice + request-ID, 404, Maintenance with downtime ETA), and **3 system states** (Rate Limit with countdown, AI Unavailable with provider status, Loading Skeleton). Each state has clear headings, an explanation of what the feature does, and at least one primary CTA.

## Key Decisions

- **Empty states teach, errors reassure** — Empty-state copy explains the feature's value and offers the next action (`Add First Node`, `Use a Template`); error-state copy emphasizes that the issue was auto-reported and gives a recovery path.
- **Type-colored empty-state icons** — Each empty state uses its primitive's color (blue for tasks, orange for decisions, purple for thread, cyan for PULSE), reinforcing the type system everywhere.
- **Request-ID surfaces in General Error** — Pulled from Sentry's `lastEventId()`; turns "the page broke" into "tell support this ID and we can find your trace."
- **Loading skeletons match shape, not generic shimmer** — A canvas skeleton looks like a canvas; a list skeleton looks like list rows.

## Files & Components Affected

- `components/ui/states/` — 12 components (`EmptyCanvas`, `EmptyDecisions`, `ErrorGeneral`, `Maintenance`, `RateLimit`, `AIUnavailable`, etc.)
- `app/(app)/error.tsx`, `app/(marketing)/error.tsx`, `app/global-error.tsx` — Wired to Sentry
- `app/not-found.tsx` — 404 page
- `lib/utils/state-router.ts` — Helper that picks the right state from API error shape

## Dependencies

- **Depends on**: Sentry (`SENTRY_DSN`) for request-IDs in General Error
- **Enables**: Every other feature can plug in honest empty/error states; was a pillar of the v1.3.2.0 → v1.3.3.6 demo-data eradication push

## Notes

- AI Unavailable polls `/api/v1/lazymind/health` every 10s and auto-recovers when both Groq + Together are reachable.
- Maintenance state is gated by an env var (`MAINTENANCE_MODE=true`) handled in `middleware.ts`.
