# Feature 46 — OpenAPI Spec Sync

## Why now

The hand-written OpenAPI spec in `lib/utils/openapi.ts` is the source of truth for the public REST contract. SDK generation, the docs site, and any third-party integration consumes it. v1.5.3.0 added `/api/v1/audit-log/export-csv` (bearer-aware), and v1.5.4.0 added `?action` + `?range` filters to `/api/v1/audit-log` and the new CSV endpoint. Neither shipped with a spec update — external clients had no way to discover the new surface.

This is plumbing; the right time to ship it is immediately after the runtime additions, while the parameter shapes are fresh.

## Scope decisions

- **Bearer-aware only.** The header comment on `openapi.ts` is explicit: every endpoint listed here is bearer-aware. `/audit-log/export-csv` qualifies (it uses `requireWorkspaceAuth`, which accepts both cookie and bearer). Out of scope: `/decisions/report` (the PDF export from #42 is cookie-only by design).
- **Hand-written, not generated.** Continue the existing pattern. Generation would be nicer but is out of scope for a sync PR.
- **Keep the `action` enum exhaustive.** Mirrors `AuditAction` from `lib/data/audit-log.ts`. The structural test compares the `range` enum against the runtime parser to catch drift; the `action` enum is left as a manual sync because it changes rarely and the seventeen string literals are not worth the test ergonomics.
- **Document the plan gate.** Both audit endpoints return 403 when the workspace plan does not include audit-log access. This was implicit before; now it's documented.

## Test approach

One new structural test asserts both endpoints declare `workspaceId`, `action`, and `range`, and that the `range` enum is exactly `['7','30','90','365','all']`. The existing `lists every bearer-aware endpoint` snapshot was updated to include the new path. The existing `export bucket` regression now covers the CSV endpoint too.

## Out of scope

- Auto-generating the spec from route handlers (much bigger refactor).
- A `/decisions/report` entry (cookie-only, deliberately not in the bearer surface).
- An `audit-log` schema entry under `components.schemas` (the JSON shape is documented in `lib/data/audit-log.ts` and the response is currently just a passthrough — promote to a typed schema if/when the SDK starts consuming it).
