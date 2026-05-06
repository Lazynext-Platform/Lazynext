# 🏛️ Architecture: Decision DNA PDF Export

> **Feature**: `42` — Decision DNA PDF Export
> **Status**: 🟢 LOCKED
> **Branch**: `feature/42-decision-dna-pdf-export`
> **Date Locked**: 2026-05-06
> **Discussion**: [discussion.md](./discussion.md)

---

## Open Questions — Resolved

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Page size | **letter (8.5×11in) with 0.75in margins** | US default; international users save-as-PDF without trouble. |
| 2 | Decision cap | **500** | Covers >99% of workspaces. ~2KB/decision keeps response under 1.5MB. Truncation banner surfaces when hit. |
| 3 | Auto-print on load | **Yes** | The user already clicked "Export PDF"; they expect the dialog. Print is reversible (cancel does nothing). |
| 4 | Cover page | **Cover with summary** (workspace name, generated-at, total / avg quality / outcome breakdown) | One-page exec summary is genuinely useful in a PDF context. |
| 5 | Plan-gate flag | **New `pdf-export` flag, gated to `starter`+ (Team plan and above)** | `dataExport` doesn't exist as a flag (despite discussion.md). One new key is fine; gate is on Team+ where decision-density actually matters. |

---

## Module Plan

```
lib/
  data/
    decision-report.ts        (NEW)   loadDecisionReport(workspaceId) — typed payload
  reports/
    decision-html.ts          (NEW)   renderDecisionReportHtml(payload) — pure string → string
app/api/v1/decisions/
  report/route.ts             (NEW)   GET ?workspaceId — text/html with embedded CSS
components/decisions/
  ExportPdfButton.tsx         (NEW)   client-side trigger — opens new tab or upgrade modal
lib/utils/plan-gates.ts       (EDIT)  add 'pdf-export' to feature map (starter+)
tests/unit/
  decision-report-renderer.test.ts (NEW) — 6+ snapshot/structure tests
  decision-report-route.test.ts    (NEW) — 5+ control-flow tests
```

No new dependency. No DB migration. No new env var.

---

## Data Contract

```ts
export interface DecisionReportRow {
  id: string
  question: string
  resolution: string | null
  rationale: string | null
  status: string
  decisionType: string | null
  options: string[]
  outcome: string
  outcomeNotes: string | null
  qualityScore: number | null
  scoreBreakdown: { clarity: number; dataQuality: number; riskAwareness: number; alternativesConsidered: number } | null
  scoreModelVersion: string | null
  createdAt: string
  qualityScoredAt: string | null
  outcomeTaggedAt: string | null
}

export interface DecisionReport {
  workspace: { id: string; name: string; plan: string }
  generatedAt: string                              // ISO
  decisions: DecisionReportRow[]                   // ≤ 500
  truncated: boolean
  totalCount: number                               // raw count BEFORE truncation
  summary: {
    avgQuality: number                             // 0..100; -1 = no scored decisions
    byOutcome: { success: number; partial: number; failed: number; pending: number }
    byType: { reversible: number; irreversible: number; experimental: number; unknown: number }
  }
}
```

---

## HTML Report Structure

```
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Decision DNA Report — {workspace.name}</title>
  <style>{INLINE_CSS}</style>
</head>
<body>
  <header class="report-cover">
    <div class="brand">Lazynext · Decision DNA</div>
    <h1>{workspace.name}</h1>
    <p class="generated">Generated {generatedAt formatted}</p>
    <section class="summary-grid">
      <div>Total Decisions · {totalCount}</div>
      <div>Avg Quality · {avgQuality}/100</div>
      <div>Outcome breakdown · success/partial/failed/pending</div>
      <div>Type breakdown · reversible/irreversible/experimental/unknown</div>
    </section>
  </header>

  {if truncated}
  <aside class="banner banner-truncated">
    Showing the most recent 500 of {totalCount} decisions.
  </aside>
  {/if}

  <nav class="toc">
    <h2>Decisions in this report</h2>
    <ol>{for each decision: <li><a href="#d-{id}">{question}</a></li>}</ol>
  </nav>

  <main>
    {for each decision}
    <article class="decision" id="d-{id}">
      <h3>{question}</h3>
      <dl class="meta">
        <dt>Status</dt><dd>{status}</dd>
        <dt>Type</dt><dd>{decisionType ?? '—'}</dd>
        <dt>Outcome</dt><dd class="outcome outcome-{outcome}">{outcome}</dd>
        <dt>Created</dt><dd>{createdAt formatted}</dd>
      </dl>
      {if resolution}<h4>Resolution</h4><p>{resolution}</p>{/if}
      {if rationale}<h4>Rationale</h4><p>{rationale}</p>{/if}
      {if options.length}<h4>Alternatives considered</h4><ul>{options}</ul>{/if}
      {if scoreBreakdown}
      <h4>Decision DNA score · {qualityScore}/100</h4>
      <svg class="score-bars" ...>4 horizontal bars: clarity / data / risk / alternatives</svg>
      {/if}
      {if outcomeNotes}<h4>Outcome notes</h4><p>{outcomeNotes}</p>{/if}
    </article>
    {/for}
  </main>

  <footer class="report-footer">
    <span>{workspace.name}</span>
    <span>lazynext.com</span>
  </footer>

  <script>
    // Auto-print on load. The user already opted in by clicking Export.
    // window.print() returns synchronously; no after-print cleanup needed.
    window.addEventListener('load', () => setTimeout(() => window.print(), 300))
  </script>
</body>
</html>
```

### CSS Strategy

`@media screen` — readable on-screen with brand background (slate-100, no header chrome).
`@media print` — overrides:
- `body { background: white; color: black; }`
- `@page { size: letter; margin: 0.75in; }`
- `.toc, .report-cover { page-break-after: always; }`
- `.decision { page-break-inside: avoid; }`
- Hide the auto-print `<script>` tag implicitly (script tags are zero-area).

---

## Route Behavior

`GET /api/v1/decisions/report?workspaceId={uuid}` (cookie-only):

1. `safeAuth` → 401 if no session.
2. Parse + validate `workspaceId` UUID → 400 if missing/malformed.
3. `verifyWorkspaceMember` → 403 if not a member.
4. Read workspace plan via `loadDecisionReport`. If plan lacks `pdf-export`, return 402 `{error: 'PLAN_LIMIT_REACHED', variant: 'pdf-export'}` JSON (NOT HTML — the client checks JSON first).
5. Build `DecisionReport` payload.
6. Render HTML via `renderDecisionReportHtml`.
7. Return `text/html` with `Cache-Control: no-store` (decision data is sensitive).

**No bearer auth in v1.** Future: gate behind a `reports:read` scope.

---

## Score Bar SVG (verbatim)

Each axis renders as a horizontal bar in lime (lazynext brand) with a black outline:

```html
<svg viewBox="0 0 200 8" width="200" height="8" aria-hidden="true">
  <rect x="0" y="0" width="200" height="8" fill="#e2e8f0" rx="4" />
  <rect x="0" y="0" width="{score * 2}" height="8" fill="#BEFF66" rx="4" />
</svg>
```

`200px × 8px` — lays out cleanly in 4-row score table.

---

## Test Matrix

| File | Cases |
|------|-------|
| `decision-report-renderer.test.ts` | (1) renders `<html>` with given workspace name, (2) shows truncated banner when payload.truncated=true, (3) hides banner otherwise, (4) renders all decisions, (5) renders score bars only when scoreBreakdown is non-null, (6) escapes HTML in user-supplied fields (XSS) |
| `decision-report-route.test.ts` | (1) 401 no session, (2) 400 missing/malformed workspaceId, (3) 403 non-member, (4) 402 plan-gated for free tier, (5) 200 returns text/html with workspace name in body |

---

## Risks

1. **XSS via user-supplied decision fields.** Mitigation: every interpolation goes through an `escapeHtml` helper; the renderer never accepts pre-rendered HTML.
2. **Decision data leaking via shared link** if user copies the URL. Mitigation: cookie-only auth + `Cache-Control: no-store`.
3. **>500 decisions** silently dropped. Mitigation: explicit banner inside the report; loader returns `truncated` and `totalCount` so the UI can also surface it.
4. **Browser blocks auto-print** in some configs. Mitigation: button still works via the standard browser File → Print menu; auto-print is a UX accelerator, not load-bearing.

---

## Decision

✅ Locked.
