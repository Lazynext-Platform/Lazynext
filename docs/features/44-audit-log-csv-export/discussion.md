# #44 — Audit Log CSV Export

**Status**: 🟢 Shipping (v1.5.3.0)
**Branch**: `feature/44-audit-log-csv-export`
**Depends on**: #43 (Audit Log Viewer UI), #38 (audit-log table)

## Why

#43 explicitly deferred this: "use the bearer endpoint" was the v1
answer. But the bearer endpoint *doesn't exist* for audit-log CSV — the
only CSV export today is `/api/v1/decisions/export-csv`. Compliance
auditors and SOC-2 evidence pulls expect CSV, not paginated JSON. A
"Download CSV" button on the audit log page closes that loop in the
same shape as the existing decisions CSV.

## What

- New `GET /api/v1/audit-log/export-csv?workspaceId=&action=` endpoint.
  Returns up to `AUDIT_CSV_CAP = 5000` rows in `created_at DESC` order
  as `text/csv` with `content-disposition: attachment`.
- New "Download CSV" button on the audit log page header. Respects
  the active action filter.

## Decisions

1. **Cap size**: 5000 rows. Same predictability rationale as #42's 500-decision cap. A workspace running >5000 audit events should be paging the bearer API anyway.
2. **Filter parity**: the CSV honors `?action=` so "Download CSV" reflects what the user is currently viewing. Range filter (date) is out of scope; matches the audit log viewer.
3. **Actor hydration**: CSV emits `actor_id` (UUID) only — no name/email lookup. Two reasons: (a) `listAuditLog`'s actor lookup is bounded to `perPage: 200` users so it's unsafe at 5000-row cap, (b) CSVs are joined externally via tooling, not viewed by humans. `actor_id` is stable; emails change.
4. **Rate limit**: shares the existing `export` bucket with `/api/v1/export` and `/api/v1/decisions/export-csv`. A single bucket means a leaked key can't scrape the workspace via three endpoints in parallel.
5. **Plan gate**: `'audit-log'` flag (Business+). Same as the viewer.

## Out of scope

- Date-range filter (track #43's note)
- Streaming for >5000 rows (use bearer + pagination)
- Including hydrated actor name/email
