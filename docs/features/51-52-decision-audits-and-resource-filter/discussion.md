# Discussion — #51 Decision Audit Producers + #52 Resource Timeline

**Status:** ✅ Merged
**Version:** v1.5.9.0
**Date:** 2026-05-06
**Branch:** `feature/51-52-decision-audits-and-resource-filter`

## Why these two together

#50 closed the loop on **node** mutations (`node.update` emits per-field
diff snapshots, the audit viewer renders them inline). It explicitly
deferred the matching work for **decisions** to a follow-up because
the implementation pattern was settled but the producer locations
were different files. That follow-up is #51.

#52 was queued for the same release because it's the natural next
question once the audit log starts carrying useful data: *"show me
just this decision's history"*. Without a resource filter the new
diff metadata is browsable only via the firehose-style workspace
timeline.

Both ship together because they share testing infrastructure
(`tests/unit/audit-*`) and a single OpenAPI rev.

## Decisions

### #51 — Snapshot the full pre-update row, not just changed fields

The PATCH producer pulls every diff-eligible column up front:
`resolution, rationale, status, outcome, outcome_notes, outcome_confidence, tags`.
None of these are unbounded blobs (no `data` jsonb like nodes have)
so the entire row is safe to snapshot — at most a few hundred bytes
per audit entry.

This means `previous` is always complete: even if more fields become
patchable later, existing audit rows still render the full pre-state.

### #51 — DELETE snapshots `question`, not the whole row

For deletes the only thing the audit viewer needs to render a useful
summary is the question. `"Should we adopt RSC?"` is enough context;
the full decision body would bloat every delete row and rarely
matter at audit-read time. Truncated to 200 chars.

### #51 — Reader uses snapshotted question/title for any `*.delete`

Both `node.delete` and `decision.delete` now read `m.question` /
`m.title`. Older rows without these snapshots still render the
legacy `Deleted` / `Deleted · via API key` line — the new code is a
pure addition.

### #52 — Resource filter requires both keys

`?resourceType=node` alone would let a caller pull every node
event in the workspace, which is a step backwards from the existing
`action` filter. We require both keys together; either alone is
silently dropped at the route layer.

### #52 — Allowlist for `resourceType`

The route restricts `resourceType` to `node | decision | workspace |
api_key | member`. This prevents a caller from probing arbitrary
table names via the audit query, and it matches the set actually
populated by current producers.

## What didn't make this release

- **Audit producers for member.* and workspace.update** — the data
  model supports it, but the route handlers don't yet emit them.
  Tracked separately when those mutations get audit attention.
- **Per-resource UI affordance** — the audit viewer doesn't yet
  surface a "show only this node" button. The API is ready; the UI
  side is a follow-up.

## Tests

- `tests/unit/audit-log-resource-filter.test.ts` — 3 cases: pair
  applied, type-only dropped, id-only dropped.
- `tests/unit/audit-metadata-summary.test.ts` — 2 added cases for
  delete-with-snapshot.
- 561/561 passing.
