# #43 — Audit Log Viewer UI · Architecture

## Layers

```
app/(app)/workspace/[slug]/audit-log/page.tsx       (server)
  ├─ getCurrentMemberWorkspace(slug)
  ├─ FeatureGate feature="audit-log" variant="audit-log-gate"
  └─ AuditLogClient
      ├─ initial: { items, nextCursor } from listAuditLog (server)
      └─ load-more: GET /api/v1/audit-log?workspaceId&cursor&action
```

## Reuses

- `lib/data/audit-log.ts` — `listAuditLog`, `AuditView`, `AuditAction` already exist.
- `app/api/v1/audit-log/route.ts` — already plan-gated, rate-limited, bearer-aware.
- `components/ui/FeatureGate.tsx` — extended with `'audit-log-gate'` variant.
- `components/ui/UpgradeModal.tsx` — new copy under `'audit-log-gate'`.

## New files

- `app/(app)/workspace/[slug]/audit-log/page.tsx` — server entry. Loads first 50 rows server-side so the empty-flash never happens. Plan-gates with FeatureGate so a non-Business member gets the upgrade card; the API is already gated independently.
- `app/(app)/workspace/[slug]/audit-log/AuditLogClient.tsx` — client. Action dropdown, table, "Load older" button. Calls the existing API for pagination.
- `lib/utils/audit-format.ts` — small pure helpers: `formatAuditAction`, `formatRelativeTime`, `formatActor`. Keeps the client component readable and testable.

## Edits

- `components/ui/FeatureGate.tsx` — add `'audit-log-gate'` and `'pdf-export-gate'` to its `UpgradeVariant` union (was lagging behind the store).
- `components/ui/UpgradeModal.tsx` — add `'audit-log-gate'` copy to `VARIANT_COPY`. Tier: Business.
- `stores/upgrade-modal.store.ts` — add `'audit-log-gate'` to `UpgradeVariant`.
- `app/(app)/workspace/[slug]/settings/page.tsx` — add an "Audit Log" link in the Security tab when `hasFeature(plan, 'audit-log')`.

## Plan gate

Existing flag `'audit-log': ['business', 'enterprise']` in `lib/utils/plan-gates.ts`. No change.

## Tests

- `tests/unit/audit-format.test.ts` — `formatAuditAction` covers every `AuditAction` (no fallthrough), `formatRelativeTime` covers <60s, minutes, hours, days, weeks.

## Security

- The page uses `getCurrentMemberWorkspace` → membership check.
- The API route already checks membership, plan, rate-limit. No new attack surface.
- Actor email/IP are sensitive; only members of a Business+ workspace can see them. Admin-only is **not** enforced — every member of a Business workspace can view. Future: gate to admin role (matches GitHub's behaviour where every member sees the org audit log on Enterprise).

## What we deliberately don't do

- No diff viewer for `metadata`. JSON `<details>` collapse only.
- No date-range filter.
- No CSV export button (use the existing bearer endpoint).
- No realtime subscription. Manual refresh only.
