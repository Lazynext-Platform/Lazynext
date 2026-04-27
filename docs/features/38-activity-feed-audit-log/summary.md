# 📋 Summary — Activity Feed & Audit Log

> **Feature**: #38 — Activity Feed & Audit Log
> **Status**: ✅ Complete (Retroactive — Audit log shipped v1.3.5.0)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A workspace Activity page with two complementary views. **Activity Feed**: a social-style chronological timeline grouped by day (Today / Yesterday / Earlier), user avatars with action-type mini icons, descriptive text with linked entity names, type badges color-coded by primitive. Real, backed by event-sourced rows. **Audit Log** (Business-plan gated): a table with Timestamp / User / Action / Target / Details / IP columns and CSV export. Audit-write hooks were added to every mutation surface in v1.3.5.0 so the log is honest, not a sample.

## Key Decisions

- **One event stream, two presentations** — Both views read from the same `audit_events` table; the feed renders user-friendly prose, the audit log renders raw rows. No duplicate write paths.
- **Audit gated to Business** — Compliance is a paid concern; Free / Team see the friendly feed.
- **Write hooks at the API layer, not the DB** — Each mutation route in `app/api/v1/` calls `auditEvent(...)` synchronously before returning. Trades a minor latency cost for guarantee that the event is recorded with the same context (user, IP, workspace).
- **CSV export piggybacks on #21 Data Export** — Same writer.
- **Activity filter pills** — `All / Tasks / Decisions / Docs / Threads / Members` — drives both views; URL-shareable.

## Files & Components Affected

- `app/(app)/workspace/[slug]/activity/page.tsx` — Page with view toggle
- `components/activity/ActivityFeed.tsx`, `AuditLogTable.tsx`
- `lib/db/schema/audit_events.ts`
- `lib/data/audit.ts` — `auditEvent({ user_id, workspace_id, action, target_type, target_id, details, ip })`
- Every mutation route in `app/api/v1/` — calls `auditEvent` (instrumentation pass v1.3.5.0)

## Dependencies

- **Depends on**: Every feature that mutates data, #13 Billing & Subscription (plan gate), #21 Data Export (CSV writer)
- **Enables**: Coordination (feed), compliance/security (audit log), incident investigation

## Notes

- IP is captured server-side from request headers (`X-Forwarded-For` chain trust pinned in `middleware.ts`).
- The audit table grows linearly with workspace activity; a future retention policy + cold-storage move is on the backlog (no current pain).
