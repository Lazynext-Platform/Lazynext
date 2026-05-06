# Feature 47 — Audit Log Metadata Summary

## Why now

The audit page (#43) is the SOC-2-friendly receipt for every workspace mutation. The metadata column shipped as a `<details>` block dumping `JSON.stringify(metadata, null, 2)`. That works as a fallback but forces auditors to mentally parse JSON to learn what changed.

The producer side (`recordAudit` callers in `app/api/v1/**`) already encodes structured metadata: `node.update` writes `{ changes: ['title','status'], viaApiKey }`; `workspace.update` writes `{ changes: { name, slug }, previous: { name, slug } }`; `ai.workflow.*` writes `{ prompt, nodeCount }`. The reader was the missing half.

## Scope decisions

- **Reader-only.** No producer changes. Every existing `recordAudit({ metadata: … })` call site stays as is. This keeps the change purely additive — old audit rows render fine, the new summary is computed from existing fields.
- **Action-keyed switch, not a generic differ.** The metadata shapes are heterogeneous; a generic differ would either be too verbose (`viaApiKey: false` is uninteresting noise) or too lossy. Hand-rolled per action makes each summary actually useful.
- **Fall through to JSON.** When `summarizeAuditMetadata` returns `null`, the `<details>` block renders unchanged. Nothing is hidden — the summary is additive.
- **`viaApiKey: true` is surfaced.** In compliance pulls, knowing whether a mutation came from a human session vs an API key is high-signal. We always append ` · via API key` when the flag is set.
- **Truncate freeform user text.** Decision questions (80 char cap), node titles (60 char cap), AI prompts (80 char cap) are bounded so the table row stays single-line. Trimmed with the standard `…` suffix.

## Test approach

13 cases in `tests/unit/audit-metadata-summary.test.ts` covering every branch of the switch: empty/null, changes array, viaApiKey suffix, workspace rename pair, workspace fallback to keys, node.create with type+title, decision.create with score, delete-with-flag, api_key with name+prefix, member with email+role, ai.workflow with prompt+nodeCount pluralisation, workspace.delete null. Pure function — no DOM, no fixtures.

## Out of scope

- A real before/after diff with field-level highlighting. Would require schema changes (we don't currently store `previous` for `node.update` / `decision.update` — only the changed keys). Possible follow-up if compliance customers ask.
- Producer-side metadata standardisation. Each site writes what's relevant for its action; the summary adapts.
- An `expand all` / `collapse all` control on the table. Each row is independently expandable.
