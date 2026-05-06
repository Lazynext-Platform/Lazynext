# Feature 48 — Audit Log POST Endpoint

## Why now

#41 (AI workflow generation) noted a deferred follow-up: client-side `ai.workflow.accepted` audit logging needed a `POST /api/v1/audit-log` that didn't exist yet. The server already records `ai.workflow.generated` at generation time, but with no commit-side event there was no way to measure how often LazyMind output was actually shipped to the canvas vs discarded.

#47 (metadata summary) made the audit page genuinely useful for compliance, which raised the value of having a complete funnel: generated → refined → accepted. This ship closes that gap.

## Scope decisions

- **Tight allowlist, not "anything goes".** The route accepts only `ai.workflow.accepted` and `ai.workflow.refined`. Every other audit action stays server-only. Reasoning: the audit log is the system-of-record for who-did-what; allowing a client to spoof a `decision.delete` or `member.remove` would let a compromised browser tab edit history.
- **Sanitised metadata.** Read only `prompt` (500-char cap), `nodeCount`, `edgeCount`, `refineCount` from the request body. Floor counts to non-negative integers. Drop everything else. Without this an attacker could dump arbitrary blobs into the audit table or inject keys like `actor_id` that look authoritative.
- **`viaApiKey` is server-derived.** Read from `requireWorkspaceAuth`'s result, not the body. A client lying about whether it came in via API key would defeat the whole point of the flag.
- **Not plan-gated for writes.** Reads are gated (Business+); writes are not. This matches every other `recordAudit` call site — producers write regardless of plan, and rows just aren't readable on lower tiers. Anything else makes the audit log a Swiss-cheese record that depends on plan history.
- **Fire-and-forget on the client.** Audit failures must not block the UI flow (`.catch(() => undefined)`). The user accepting a workflow doesn't care about audit reachability, and a failed audit is a degraded compliance trail, not a degraded product.
- **Mutation rate-limit bucket, not a new one.** Sharing the existing 30/min mutation bucket is fine — these calls happen at most a handful of times per workflow accept session.

## Bonus fix

The GET-side `VALID_ACTIONS` allowlist in `app/api/v1/audit-log/route.ts` was missing the three `ai.workflow.*` entries. The export-csv route had them; the page dropdown listed them; only the JSON list endpoint silently dropped them, so filtering by "AI workflow generated" returned every row instead of just the AI ones. Aligned the two server allowlists.

## Test approach

11 cases in `tests/unit/audit-log-post-route.test.ts`:
- Validation: `INVALID_JSON`, `MISSING_WORKSPACE_ID`
- Allowlist: `decision.delete`, `ai.workflow.generated` (server-only), unknown action
- Auth passthrough: 401 when `requireWorkspaceAuth` returns `ok: false`
- Rate-limit: 429 when bucket empty
- Sanitisation: attacker-supplied `actor_id`, `ip`, `rogue` keys must be dropped from the recorded metadata
- Bounding: 800-char prompt → exactly 500, fractional counts floored, negative `edgeCount` clamped to 0
- `viaApiKey: true` propagates from bearer auth
- 500 `AUDIT_WRITE_FAILED` when `recordAudit` returns false

Plus an OpenAPI regression assertion that the route's `action` enum is exactly the two-value allowlist.

## Out of scope

- Adding more client-writable actions. Every new entry on the allowlist is a new threat model conversation; we add them one at a time when there's a real client-side event to record.
- Decision-side commit audit (`decision.commit`?). That mutation already happens server-side via `POST /api/v1/decisions`, so the existing `decision.create` audit covers it.
- Replaying historical accept events. There's no way to reconstruct what wasn't recorded; the funnel starts on the day this ships.
