# 📋 Summary — Data Export

> **Feature**: #21 — Data Export
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A Settings sub-page that delivers on Lazynext's "no vendor lock-in" promise. **Full Workspace Export** (JSON or CSV, scope = all workflows or single workflow, summary of what's included). **Decisions-Only Export** (JSON / CSV / PDF Report, date-range filter — All time / 30d / 90d / This year). **Export History** with re-download links (30-day retention). **API access reference** documenting `GET /api/v1/export/workspace` and `GET /api/v1/export/decisions` for programmatic access (Pro/Business plans).

## Key Decisions

- **JSON is the canonical format** — Round-trippable; an import endpoint accepts the same JSON shape. CSV is for spreadsheet users; PDF (decisions only) is for stakeholder reporting.
- **Exports run as Inngest jobs** — Asynchronous because workspace exports can be large; the page polls and shows progress, then surfaces a Supabase Storage download URL.
- **30-day retention with re-download** — Striking the balance between "users can grab it again" and "we don't store data indefinitely." After 30 days the file is purged but the metadata row remains.
- **API access is a paid-plan feature** — The Settings page links to the API but the endpoints check plan via `lib/wms.ts` and 403 on Free.

## Files & Components Affected

- `app/(app)/workspace/[slug]/settings/data-export/page.tsx`
- `components/settings/ExportCard.tsx`, `ExportHistoryTable.tsx`
- `lib/inngest/functions/workspace-export.ts`, `decisions-export.ts`
- `app/api/v1/export/workspace/route.ts`, `app/api/v1/export/decisions/route.ts`
- `lib/db/schema/exports.ts` — `exports` table tracks job state + storage URL

## Dependencies

- **Depends on**: Supabase Storage (file hosting), Inngest (job runner), #13 Billing (plan gate on API access)
- **Enables**: Trust signal for evaluators; compliance use case for regulated industries

## Notes

- PDF generation uses `@react-pdf/renderer` server-side; the same components are reusable for future report templates.
- The summary counts ("3 workflows, 84 nodes…") are computed live from the workspace before the export starts so users see the truth, not a placeholder.
