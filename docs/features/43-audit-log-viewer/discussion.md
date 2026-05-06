# #43 — Audit Log Viewer UI

**Status**: 🟢 Shipping (v1.5.2.0)
**Branch**: `feature/43-audit-log-viewer`
**Depends on**: #38 (Activity Feed & Audit Log — table + write hooks)

## Why

The audit-log table has been writing rows since v1.3.5.0 (every workspace
mutation calls `recordAudit`). The data is queryable via
`GET /api/v1/audit-log` (cookie + bearer), but **the only way an admin
can actually read it is via the API**. There's no in-app surface.

For Business + Enterprise customers (the audience that paid for the
audit log) this is a compliance gap: SOC-2 evidence pulls require
clickable proof, not curl. Every "who deleted that workspace?" / "when
did this role change?" question currently routes to engineering.

## What

A read-only paginated viewer at
`/workspace/[slug]/audit-log` showing actor, action, target, IP, and
timestamp. Filter by action type. Plan-gated to Business+ (matches the
existing `'audit-log'` flag in `lib/utils/plan-gates.ts`).

## Open questions (resolved)

1. **Settings tab vs standalone route?** → Standalone route. The settings
   page is a single client component; injecting a server-paginated list
   into it adds bidirectional state plumbing. A sibling route is the
   same UX (a link from the settings page) with none of the entanglement.
2. **Page size?** → 50 default, max 200 (matches the API). Server-render
   the first page; client load-more for subsequent.
3. **Filter shape?** → Single dropdown over the existing 17 action types.
   No date-range filter v1; cursor pagination already gives ~time-range
   slicing for the common "recent" case.
4. **What if free/team callers browse to the URL?** → `FeatureGate` with
   `'audit-log-gate'` variant. Matches the established `health-gate` /
   `automation-gate` / `sso-gate` pattern.
5. **Export?** → Out of scope v1. The bearer-auth endpoint already
   covers programmatic pulls; ship the UI first, judge demand for an
   in-page CSV button after.

## Out of scope

- Date-range filter
- CSV export button (use the existing API)
- Diff viewer for `metadata` payloads (most rows have ~3 keys; the JSON
  pretty-print collapse is enough)
- Slack alerts on specific actions (that's #17 Automation territory)
