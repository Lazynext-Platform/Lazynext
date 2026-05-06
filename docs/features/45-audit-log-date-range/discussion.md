# #45 — Audit Log Date-Range Filter

**Status**: 🟢 Shipping (v1.5.4.0)
**Branch**: `feature/45-audit-log-date-range`
**Depends on**: #43, #44

## Why

Both prior audit-log ships left date-range out of scope. The viewer
defaults to "all time", which on a year-old workspace returns the
oldest rows last (after many "Load older" clicks) and inflates the CSV
export to maximum 5000 rows of mostly-stale events. Compliance pulls
typically scope to a quarter or a year; "everything since dawn" is
both a UX and a payload problem.

## What

A single `?range=7|30|90|365|all` parameter, plumbed through the
loader, the JSON list endpoint, the CSV endpoint, and the page UI.
Default `'all'` (preserves today's behavior for any user who's
bookmarked a non-range URL).

## Decisions

1. **Range shape** — the same fixed-bucket dropdown as `decisions/export-csv` (7d / 30d / 90d / 1y) plus "all". No custom calendar v1 — buckets cover 95% of compliance scopes and the UI stays single-select.
2. **Where applied** — `audit_log.created_at >= cutoff` clause. Cursor pagination still works because the cutoff is independent of the cursor.
3. **CSV filename** — appends the range when set: `lazynext-audit-log-90d-2026-05-06.csv`. Auditors evaluate filenames before opening files.
4. **Default `'all'`** — every other decision filter on the platform defaults to "no filter"; matching that minimises surprise.
5. **Shared parser** — `parseAuditRange(input)` in `lib/utils/audit-format.ts` so route + page + client all validate identically.

## Out of scope

- Custom date pickers (calendar UI)
- Range presets beyond the four we already use elsewhere
- Saved filter views
