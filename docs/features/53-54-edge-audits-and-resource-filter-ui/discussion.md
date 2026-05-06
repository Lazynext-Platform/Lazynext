# Discussion — #53 Resource Filter UI + #54 Edge Audit Producers

**Status:** ✅ Merged
**Version:** v1.5.10.0
**Date:** 2026-05-06
**Branch:** `feature/53-54-edge-audits-and-resource-filter-ui`

## Why these two together

#52 shipped the resource filter as an API parameter pair but left the
audit page UI unaware of it — a useful capability nobody could
discover. #53 closes that loop: every resource id in the table is now
a click target that scopes the view to that resource's full
lifecycle, and an active-filter pill at the top of the table makes
the current scope obvious and clearable in one click.

#54 ships alongside because the audit log was missing edges. Nodes,
decisions, api keys, workspaces, and members all had producers; edges
were the one mutation surface that left no trail. Adding the two
actions touches the same files as #53 (the audit page allowlist, the
client dropdown, the OpenAPI enum) so it's cheaper to ship together.

## Decisions

### #53 — Active filter shown as a pill, not a sidebar

The pill renders inline above the table, with `resourceType` and the
truncated `resourceId` in monospace, plus a Clear button. This keeps
the existing filter-bar shape (action + range + CSV export button)
unchanged — the resource scope is treated as a transient lens you
zoom into, not as a fourth permanent control.

### #53 — Click resource id to filter, not click row

A button-styled `resource_id` cell makes the affordance discoverable
without committing the entire row to a click handler (which would
fight with the `<details>` raw-metadata expander already in the row).
Hover state previews the action.

### #53 — Filter composes with action + range

The filter pair is added to the URL alongside any existing `action`
and `range` query params. Load-more's cursor fetch propagates all
four. This means stacked queries like "this node's `node.update`
events in the last 7 days" work without any extra wiring.

### #54 — Edges have no PATCH, so no `edge.update`

`/api/v1/edges` only supports POST and DELETE — edges are deleted
and re-created, not patched. We add only `edge.create` and
`edge.delete` to the `AuditAction` union.

### #54 — Snapshot workflow/source/target on DELETE

The delete producer reads `workflow_id, source_id, target_id` from
the row before deletion so the audit summary can render a
`Workflow {prefix}` breadcrumb even after the row is gone.

### #54 — Add `edge` to the resource-type allowlist

Both the API allowlist (#52) and the page allowlist (#53) now accept
`edge`. The summary placeholder in `summarizeAuditMetadata` uses the
workflow id rather than trying to resolve a label.

## What didn't make this release

- **Click-through to the resource itself** — the per-resource view
  still scopes the audit log only. A node-detail panel or
  decision-detail panel that opens to the same audit timeline is a
  separate UI surface.
- **Bulk audit producers** — bulk node deletes via the canvas don't
  yet emit a single `node.bulk_delete` action; they fan out as
  individual `node.delete` rows. That's intentional for now (each
  row is independently auditable) but could be revisited.

## Tests

- `tests/unit/audit-metadata-summary.test.ts` gains 1 case covering
  the `edge.*` summary branch (workflow prefix, viaApiKey, fallback).
- 562/562 passing.
