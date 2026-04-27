# 📋 Summary — Automation Builder

> **Feature**: #17 — Automation Builder
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A full-page automations surface with two views: a **list view** showing every configured automation as a card (name, trigger→action summary, run count, last-triggered, active/paused toggle) and a **builder view** with a WHEN (trigger) + THEN (actions) form. Real engine shipped in v1.3.7.0: triggers `decision.logged` + `task.created`; actions `notification.send` + `webhook.post`. Every run is captured in a run-history table with status, payload, and error trace if any.

## Key Decisions

- **WHEN/THEN over a graph** — A linear trigger→action grammar is approachable to non-technical users. A node-graph builder (Zapier-style) is over-engineered for v1.0.
- **Inngest as the runtime** — Inngest is already in the stack for background jobs; reusing it for automations means we get retries, observability, and idempotency for free.
- **Run history is part of the feature, not a side panel** — Debugging is the failure mode; surfacing run logs inline reduces support load and builds trust.
- **Pro-plan gated** — Automations are a paid feature; the list view shows a "Pro" badge, and creating a new automation on Free triggers the paywall (#22).
- **Webhook target is allow-list-validated** — `notification.send` is internal; `webhook.post` requires the URL to be validated server-side to prevent SSRF.

## Files & Components Affected

- `app/(app)/workspace/[slug]/automations/page.tsx` — List view
- `app/(app)/workspace/[slug]/automations/[id]/page.tsx` — Builder view
- `components/automations/TriggerSelector.tsx`, `ActionList.tsx`, `RunHistoryTable.tsx`
- `lib/inngest/functions/automation-runner.ts` — Inngest function that subscribes to triggers
- `lib/inngest/triggers.ts` — `decision.logged`, `task.created` event emitters
- `app/api/v1/automations/route.ts`, `app/api/v1/automations/[id]/runs/route.ts`
- `lib/db/schema/automations.ts`, `automation_runs.ts`

## Dependencies

- **Depends on**: #05 Workflow Canvas (event sources), #13 Billing & Subscription (plan gate), #23 Notification Center (one of the action sinks)
- **Enables**: Codified team workflows; reduces operational toil for repetitive tasks

## Notes

- Adding a new trigger = emit a new Inngest event from the source code path + register it in `triggers.ts`.
- `webhook.post` HMAC-signs outgoing payloads with a per-automation secret stored in Supabase Vault.
