# Features 49 + 50 — Decision Report Bearer Auth & Audit Log Diff Viewer

Two deferred follow-ups that close together because they're small, independent, and ship as one version bump (v1.5.8.0).

## #49 — Open `/decisions/report` to bearer auth

### Why now
#42 shipped the Decision DNA report cookie-only with the explicit footnote "no bearer scope yet — see architecture.md". The SDK ergonomics (`@lazynext/sdk`) are otherwise complete; this was the last bearer-aware GET we hadn't opened. SDK consumers want a programmatic Decision DNA dump that they can pipe through their own renderer (puppeteer, headless-chrome, weasyprint).

### Scope decisions
- **Switch `safeAuth` + `verifyWorkspaceMember` for `requireWorkspaceAuth`.** That single helper handles both cookie and bearer paths and already returns the right 401/403 response.
- **Plan gating stays workspace-scoped, not caller-scoped.** Bearer keys still need the workspace plan to include `pdf-export` (Team+). This matches every other bearer-aware export.
- **Rate-limit bucket keyed by `rateLimitId`.** `key:<keyId>` for bearer, `user:<userId>` for cookie. A leaked key can no longer burn a human user's export budget.
- **`autoPrint` defaults to true; bearer requests pass false.** The auto-print `<script>` only makes sense for a human in a browser tab. The renderer takes a new optional `{ autoPrint?: boolean }` argument so the route can opt out without forking the renderer.

### Out of scope
- An explicit `pdf` content-negotiation. The HTML output is the contract; clients render to PDF themselves. We could add a server-side puppeteer renderer later, but that's a much bigger ship.

## #50 — Audit log diff viewer for `node.update`

### Why now
#47 shipped the metadata summary explicitly out-of-scoping a real before/after diff: "would require schema changes (we don't currently store `previous`)". Compliance reviews wanted the diff. The producer-side change is small and the reader extension reuses the existing summary plumbing.

### Scope decisions
- **`node.update` only this ship; not `decision.update`.** The decision PATCH route currently doesn't emit any `decision.update` audit at all — wiring that producer is its own ship. The reader handles both cases identically, so the diff format is ready when that producer is added.
- **`previous` + `next` snapshots, not full row diffs.** Only the changed keys are recorded, and the unbounded `data` blob is excluded. Storing the full previous row would balloon audit storage; storing only changed keys keeps the audit table compact.
- **Reader format:** `field: "Old" → "New" · field: "Old" → "New"` for up to three fields, then `(+N more)`. Long strings truncate to 40 chars. Null renders as em-dash. Arrays/objects collapse to `[N]` / `{…}` placeholders so the summary stays single-line.
- **Backwards compatible.** Older rows without `previous`/`next` keys fall through to the existing `Edited: title, status` summary. The `data` field falls through to the same legacy summary.

### Out of scope
- A full timeline view per resource that stitches sequential audit rows into a "title changed three times this week" history. Possible follow-up.
- Storing diffs for `decision.update` (the producer doesn't emit any audit yet).
- Storing diffs for the `data` blob — too large to inline. A future dedicated diff endpoint could load it on demand.
