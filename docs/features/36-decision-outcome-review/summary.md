# 📋 Summary — Decision Outcome Review

> **Feature**: #36 — Decision Outcome Review
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The closing half of the Decision DNA loop. A modal that prompts users to tag the outcome of a past decision (after 30/60/90-day windows) or that opens manually from the decision detail. Shows the **decision context** (type badge, date decided, title, rationale, quality score, decided-by avatar), three **emoji outcome options** (👍 Good / 😐 Neutral / 👎 Bad with descriptions), an optional **outcome notes** textarea, an optional **key learning** one-liner, a **LazyMind AI suggestion** based on linked task completion + decision quality, and queue navigation when multiple decisions are due for review.

## Key Decisions

- **Outcome is its own modal, not embedded in the decision panel** — Reviewing is a different mental mode than logging; a focused modal preserves the ritual.
- **3 outcomes, not 5** — Good / Neutral / Bad. A 5-point scale tempts users to always pick the safe middle. Three forces a stance.
- **Key learning is the highest-value field** — Surfaces in the Decision Health dashboard (#08) tag cloud and in LazyMind's pattern responses. Optional but heavily nudged.
- **Queue navigation for batch review** — When the prompt fires for 3 due decisions, a `2 of 3` indicator + Next/Skip lets users finish a batch without context switching.
- **`Remind me later` reschedules to 7 days** — Avoids forced false answers; makes the review system patient.

## Files & Components Affected

- `components/decisions/OutcomeReviewModal.tsx`
- `components/decisions/OutcomeQueue.tsx` — Multi-decision navigation
- `lib/db/schema/decisions.ts` — `outcome`, `outcome_notes`, `learning`, `outcome_reviewed_at` columns
- `lib/inngest/functions/decision-review-prompts.ts` — Schedules the prompt at 30/60/90 days
- `app/api/v1/decisions/[id]/outcome/route.ts`

## Dependencies

- **Depends on**: #07 Decision DNA View, #08 Decision Health Dashboard, #10 LazyMind AI Panel, #23 Notification Center (review prompts)
- **Enables**: The decision-quality learning loop — outcomes feed back into Health Dashboard analytics

## Notes

- The Health Dashboard's "Untagged Decisions" banner deep-links to the same modal.
- LazyMind suggestion is generated lazily when the modal opens; cached per decision for 24h.
