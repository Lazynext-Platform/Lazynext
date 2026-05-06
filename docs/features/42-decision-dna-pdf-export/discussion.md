# 💬 Discussion: Decision DNA PDF Export

> **Feature**: `42` — Decision DNA PDF Export
> **Status**: 🟡 IN DISCUSSION → ARCHITECTURE
> **Branch**: `feature/42-decision-dna-pdf-export`
> **Depends On**: #07 Decision DNA View, #08 Decision Health Dashboard, #21 Data Export
> **Date Started**: 2026-05-06

---

## Summary

Decision DNA (#07/#08) is the central thesis of Lazynext — every decision carries a quality score, an outcome, and a Decision Maker's Trail. Today, that data lives behind a login. To share decision quality with stakeholders who don't have a workspace seat (board members, auditors, partners), users have to screenshot the dashboard. **Feature #42** ships a printable, branded **Decision DNA report** that any workspace member can export and save as a PDF.

This feature does **not** add a node type, edit decisions, or change scoring. It's read-only output of existing data.

---

## Functional Requirements

- As a **workspace owner**, I want a one-click "Export PDF" on the Decision Health dashboard so I can attach a quality report to a board pack.
- As a **decision maker**, I want my exported decision rationale + score breakdown + outcome to be human-readable (not raw JSON) so non-technical readers can follow it.
- As a **maintainer**, I want the export to be deps-free so we don't take on a Puppeteer/Chromium dependency for a one-button feature.
- As a **billing admin**, I want PDF export gated to **Pro+** plans so it differentiates the paid tier without locking a core read out for free users.
- As a **compliance reviewer**, I want every decision in the report to carry: the question, the resolution, the rationale, the alternatives considered, the score breakdown, the outcome (if logged), and the timestamps — i.e., enough to reconstruct the decision trail.

---

## Current State / Reference

### What Exists

- **Decision data model**: `decisions` table; quality scoring at [`lib/ai/decision-scorer.ts`](../../../lib/ai/decision-scorer.ts) and [`lib/ai/decision-quality.ts`](../../../lib/ai/decision-quality.ts); `DecisionScoreBreakdown` 4-axis shape in `lib/db/schema`.
- **Health dashboard** at `/workspace/[slug]/decisions/health` (page + loaders): quality trends (sparkline), outcome donut, burndown chart, makers table — all server-rendered today via [`lib/data/decision-health.ts`](../../../lib/data/decision-health.ts).
- **JSON export** at `/api/v1/export/route.ts` ships every decision row + workflows + nodes + edges. The shape we'd embed in a PDF is a strict subset.
- **Plan gates**: [`lib/utils/plan-gates.ts`](../../../lib/utils/plan-gates.ts) — `PLAN_FEATURES.dataExport` already exists; PDF export is naturally a Pro+ entitlement.
- **Print styles**: not used anywhere in the app yet — green-field for `@media print`.

### What Works Well

- The data we'd render is **already SQL-fetched** by the dashboard loader; we don't need a new query path.
- The 4-axis score breakdown is already computed and stored — formatting it as a quality bar chart is pure presentation.
- We have a brand identity (lime accent + slate-950 dark / white light) that translates cleanly to a print-ready, white-background, black-text report.

### What's Missing

- A **server-rendered HTML route** that produces a print-optimized "report" document.
- A **print stylesheet** that hides chrome (no header, no nav, no buttons) and lays out for letter-size paper.
- A **client export button** that opens the report in a new tab and triggers the browser print dialog.
- A **plan gate** wrapper on the button.

### Constraints / Non-Goals

- **No PDF library.** pdf-lib, @react-pdf/renderer, Puppeteer, Playwright, wkhtmltopdf — all OUT. Per AGENTS.md, dependency adds need human approval and the print-stylesheet route is functional today. We can revisit if the print path proves insufficient.
- **No interactive chart libraries** in the report. The dashboard's sparkline + donut are already pure-SVG component code; we reuse them server-side.
- **No async background-job pipeline.** The report renders synchronously per request. A workspace with 10,000 decisions is out-of-scope for v1; we cap at 500 decisions per report and surface a banner when the cap is hit.
- **No emailing the PDF.** That's a follow-up tied to `#19 Email Templates`.
- **No bearer auth** in v1. Cookie-session only — same gate as the dashboard the export is sourced from.

---

## Proposed Approach

Three layers, each independently testable:

### Layer 1 — Data loader

`lib/data/decision-report.ts` — a single function `loadDecisionReport(workspaceId)` returns the typed report payload:

```ts
{
  workspace: { id, name, plan }
  generatedAt: string
  decisions: DecisionReportRow[]      // ≤ 500, ordered by created_at desc
  truncated: boolean                   // true when raw count exceeded the cap
  summary: {
    total: number
    avgQuality: number
    byOutcome: Record<string, number>  // success / partial / failed / pending
    byType: Record<string, number>     // reversible / irreversible / experimental / unknown
  }
}
```

Reuses existing decision-fetch pattern; adds the summary aggregation server-side so the renderer is pure presentation.

### Layer 2 — Print-optimized server route

`/api/v1/decisions/report/route.ts` — `GET ?workspaceId=…` returns `text/html`. Server-rendered with embedded CSS (no `<link>`s, no JS):

- **Cover page**: workspace name, generation timestamp, summary stats card.
- **Table of contents**: list of decisions linked by `#anchor`.
- **One section per decision**: question, resolution, rationale, alternatives considered, **4-axis score breakdown bar** (pure inline SVG), outcome chip, timestamps.
- **Footer on every printed page**: page number + workspace name + `lazynext.com`.

The CSS file is embedded inside a `<style>` tag — keeps the response a single self-contained file the browser can save. `@media print` rules:
- white background (override the dark theme),
- 11pt body / 18pt cover heading,
- letter-size with 0.75in margins,
- `page-break-inside: avoid` on each decision card,
- `page-break-after: always` after the cover page.

The route is plan-gated on `PLAN_FEATURES.dataExport`. Free-tier requests get 402 + paywall variant `'pdf-export'`.

### Layer 3 — Client trigger

A new "Export PDF" button on the Decision Health dashboard top bar opens `/api/v1/decisions/report?workspaceId=…` in a new tab and calls `window.print()` on `load`.

Two variants:
- **Free plan**: button is rendered but click opens the upgrade modal (variant `'pdf-export'`).
- **Pro+ plan**: button opens the report tab; the report's inline JS (one `<script>` tag) auto-prints on load.

The auto-print script is the report's only JS. No bundler, no build step.

---

## Open Questions (resolve in `architecture.md`)

1. **Page size**: letter (US default) vs A4 (international). Recommend letter; many users will save-as-PDF and the sizing translates.
2. **Cap at 500 decisions**: too low? Too high? Recommend 500 — covers >99% of workspaces and keeps the response under ~2MB.
3. **Auto-print on load** vs button-driven print. Recommend auto-print: the user already clicked "Export PDF"; they expect the dialog.
4. **Cover-page content**: include the executive summary (avg quality / outcome donut) on the cover, or push to its own page? Recommend cover.
5. **Plan-gate scope**: `dataExport` (existing flag) vs new `pdfExport` flag. Recommend reusing `dataExport` — don't proliferate flags.

---

## Mastery Stage Plan

1. **Discussion** — ✅ this file
2. **Architecture** — lock the open questions; specify the HTML/CSS structure verbatim; specify the renderer signatures.
3. **Tasks** — 10–12 checkboxes.
4. **Build** — loader, route, button, tests.
5. **Ship** — v1.5.1.0 (minor; new capability).
6. **Reflect** — measure click-through and Pro+ upgrade attribution.

---

## Decision

> **Pending architecture lock.**
