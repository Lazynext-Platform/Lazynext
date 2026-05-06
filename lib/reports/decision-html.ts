/**
 * Pure-string HTML renderer for Decision DNA reports.
 *
 * Locked in `docs/features/42-decision-dna-pdf-export/architecture.md`.
 * No DOM, no React, no template engine — just typed string concatenation
 * with a strict `escapeHtml` boundary on every interpolation. The route
 * handler returns the result with `Content-Type: text/html` and the
 * browser handles printing.
 *
 * Why not React SSR? React introduces a build-time and runtime that's
 * overkill for a one-page report. A typed builder + escape function
 * gives us 100% control of `@page` rules and inline `<style>`, which
 * is what print fidelity actually depends on.
 */

import type { DecisionReport, DecisionReportRow } from '@/lib/data/decision-report'

// ─────────────────────────────────────────────────────────────
// HTML escape — XSS defense for every user-supplied field. The
// renderer NEVER accepts pre-rendered HTML from the loader.
// ─────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c] ?? c)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ─────────────────────────────────────────────────────────────
// Inline CSS. Two-tier: screen view (slate background, readable in
// any browser) + print view (white, page rules, no chrome).
// ─────────────────────────────────────────────────────────────

const REPORT_CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
  background: #f1f5f9;
  color: #0f172a;
  line-height: 1.5;
}
.report-cover {
  padding: 6rem 3rem 3rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}
.brand {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #475569;
}
.brand::before { content: ''; display: inline-block; width: 0.5rem; height: 0.5rem; background: #BEFF66; border: 1px solid #0A0A0A; border-radius: 1px; margin-right: 0.5rem; vertical-align: 1px; }
.report-cover h1 { font-size: 2.5rem; margin: 0.75rem 0 0.5rem; line-height: 1.1; }
.generated { color: #64748b; font-size: 0.875rem; margin: 0 0 2rem; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 2rem;
}
.summary-grid > div {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  background: #f8fafc;
}
.summary-grid h4 { margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.summary-grid .big { font-size: 2rem; font-weight: 700; line-height: 1; }
.summary-grid .pair { display: flex; justify-content: space-between; font-size: 0.875rem; margin: 0.25rem 0; }

.banner {
  margin: 1rem 3rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
}
.banner-truncated { background: #fef3c7; border: 1px solid #fbbf24; color: #78350f; }

.toc {
  padding: 2rem 3rem;
  background: white;
}
.toc h2 { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1rem; }
.toc ol { columns: 2; column-gap: 2rem; margin: 0; padding-left: 1.25rem; font-size: 0.875rem; }
.toc li { break-inside: avoid; margin-bottom: 0.25rem; }
.toc a { color: #1e293b; text-decoration: none; }
.toc a:hover { text-decoration: underline; }

main { padding: 0 3rem 3rem; }
.decision {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.decision h3 { margin: 0 0 0.75rem; font-size: 1.125rem; line-height: 1.3; }
.decision h4 { margin: 1rem 0 0.25rem; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
.decision p { margin: 0.25rem 0; font-size: 0.9375rem; }
.decision ul { margin: 0.25rem 0; padding-left: 1.25rem; font-size: 0.9375rem; }

dl.meta { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 0.5rem 0 1rem; font-size: 0.875rem; }
dl.meta dt { color: #64748b; font-weight: 500; }
dl.meta dd { margin: 0; color: #0f172a; }
.outcome {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.outcome-success { background: #dcfce7; color: #166534; }
.outcome-partial { background: #fef3c7; color: #78350f; }
.outcome-failed  { background: #fee2e2; color: #7f1d1d; }
.outcome-pending { background: #f1f5f9; color: #475569; }

.score { margin: 0.5rem 0; }
.score-row { display: grid; grid-template-columns: 130px 1fr 36px; gap: 0.5rem; align-items: center; margin: 0.25rem 0; font-size: 0.8125rem; }
.score-label { color: #475569; }
.score-bar-bg { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; }
.score-bar-fill { background: #BEFF66; border-right: 1px solid #0A0A0A; height: 100%; }
.score-num { text-align: right; font-variant-numeric: tabular-nums; color: #0f172a; }

.report-footer {
  display: flex;
  justify-content: space-between;
  padding: 2rem 3rem;
  font-size: 0.75rem;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
  background: white;
}

@page { size: letter; margin: 0.75in; }
@media print {
  body { background: white; color: black; font-size: 11pt; }
  .report-cover { padding: 0; border: none; page-break-after: always; }
  .report-cover h1 { font-size: 28pt; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .toc { padding: 0; background: transparent; page-break-after: always; }
  .toc ol { columns: 1; }
  .toc a { color: black; }
  .banner { margin: 0 0 1rem; }
  main { padding: 0; }
  .decision { page-break-inside: avoid; border-radius: 0; border: 1px solid #cbd5e1; box-shadow: none; padding: 0.75rem; margin-bottom: 0.75rem; background: white; }
  .report-footer { display: none; }
}
`
  .replace(/\s+/g, ' ')
  .trim()

// ─────────────────────────────────────────────────────────────
// Inline auto-print script. Architecture decision #3: the user
// already opted in by clicking Export. setTimeout breathes long
// enough for the layout pass to settle on slow devices.
// ─────────────────────────────────────────────────────────────

const AUTO_PRINT_SCRIPT = `window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });`

// ─────────────────────────────────────────────────────────────
// Score-bar SVG. 4 axes × 1 bar each, lime fill on slate background.
// ─────────────────────────────────────────────────────────────

function scoreRow(label: string, value: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    '<div class="score-row">' +
    `<span class="score-label">${escapeHtml(label)}</span>` +
    '<span class="score-bar-bg">' +
    `<span class="score-bar-fill" style="width:${clamped}%"></span>` +
    '</span>' +
    `<span class="score-num">${clamped}</span>` +
    '</div>'
  )
}

function renderDecision(d: DecisionReportRow): string {
  const parts: string[] = []
  parts.push(`<article class="decision" id="d-${escapeHtml(d.id)}">`)
  parts.push(`<h3>${escapeHtml(d.question)}</h3>`)

  parts.push('<dl class="meta">')
  parts.push(
    `<dt>Status</dt><dd>${escapeHtml(d.status)}</dd>`,
    `<dt>Type</dt><dd>${escapeHtml(d.decisionType ?? '—')}</dd>`,
    `<dt>Outcome</dt><dd><span class="outcome outcome-${escapeHtml(d.outcome)}">${escapeHtml(d.outcome)}</span></dd>`,
    `<dt>Created</dt><dd>${escapeHtml(fmtDate(d.createdAt))}</dd>`,
  )
  parts.push('</dl>')

  if (d.resolution) parts.push(`<h4>Resolution</h4><p>${escapeHtml(d.resolution)}</p>`)
  if (d.rationale) parts.push(`<h4>Rationale</h4><p>${escapeHtml(d.rationale)}</p>`)

  if (d.options.length) {
    parts.push(
      '<h4>Alternatives considered</h4><ul>' +
        d.options.map((o) => `<li>${escapeHtml(o)}</li>`).join('') +
        '</ul>',
    )
  }

  if (d.scoreBreakdown && typeof d.qualityScore === 'number') {
    parts.push(`<h4>Decision DNA score · ${escapeHtml(String(d.qualityScore))}/100</h4>`)
    parts.push('<div class="score">')
    parts.push(scoreRow('Clarity', d.scoreBreakdown.clarity))
    parts.push(scoreRow('Data quality', d.scoreBreakdown.dataQuality))
    parts.push(scoreRow('Risk awareness', d.scoreBreakdown.riskAwareness))
    parts.push(scoreRow('Alternatives', d.scoreBreakdown.alternativesConsidered))
    parts.push('</div>')
    if (d.scoreModelVersion) {
      parts.push(
        `<p style="font-size:0.75rem;color:#64748b;margin-top:0.5rem">Scored by ${escapeHtml(d.scoreModelVersion)}${d.qualityScoredAt ? ' · ' + escapeHtml(fmtDate(d.qualityScoredAt)) : ''}</p>`,
      )
    }
  }

  if (d.outcomeNotes) {
    parts.push(`<h4>Outcome notes</h4><p>${escapeHtml(d.outcomeNotes)}</p>`)
  }

  parts.push('</article>')
  return parts.join('')
}

function summaryCards(report: DecisionReport): string {
  const { totalCount, summary } = report
  const out = summary.byOutcome
  const ty = summary.byType
  const avgLabel = summary.avgQuality < 0 ? '—' : `${summary.avgQuality}/100`
  return [
    '<section class="summary-grid">',
    '<div>',
    '<h4>Total Decisions</h4>',
    `<div class="big">${totalCount}</div>`,
    '</div>',
    '<div>',
    '<h4>Average Quality</h4>',
    `<div class="big">${avgLabel}</div>`,
    '</div>',
    '<div>',
    '<h4>Outcomes</h4>',
    `<div class="pair"><span>Success</span><span>${out.success}</span></div>`,
    `<div class="pair"><span>Partial</span><span>${out.partial}</span></div>`,
    `<div class="pair"><span>Failed</span><span>${out.failed}</span></div>`,
    `<div class="pair"><span>Pending</span><span>${out.pending}</span></div>`,
    '</div>',
    '<div>',
    '<h4>Decision Types</h4>',
    `<div class="pair"><span>Reversible</span><span>${ty.reversible}</span></div>`,
    `<div class="pair"><span>Irreversible</span><span>${ty.irreversible}</span></div>`,
    `<div class="pair"><span>Experimental</span><span>${ty.experimental}</span></div>`,
    `<div class="pair"><span>Unknown</span><span>${ty.unknown}</span></div>`,
    '</div>',
    '</section>',
  ].join('')
}

// ─────────────────────────────────────────────────────────────
// Public renderer
// ─────────────────────────────────────────────────────────────

export function renderDecisionReportHtml(report: DecisionReport): string {
  const wsName = escapeHtml(report.workspace.name)
  const generated = escapeHtml(fmtDate(report.generatedAt))

  const banner = report.truncated
    ? `<aside class="banner banner-truncated">Showing the most recent ${report.decisions.length} of ${report.totalCount} decisions.</aside>`
    : ''

  const toc = report.decisions.length
    ? '<nav class="toc"><h2>Decisions in this report</h2><ol>' +
      report.decisions
        .map(
          (d) =>
            `<li><a href="#d-${escapeHtml(d.id)}">${escapeHtml(d.question)}</a></li>`,
        )
        .join('') +
      '</ol></nav>'
    : ''

  const main =
    '<main>' +
    (report.decisions.length
      ? report.decisions.map(renderDecision).join('')
      : '<div class="decision"><p style="color:#64748b">No decisions in this workspace yet.</p></div>') +
    '</main>'

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="robots" content="noindex,nofollow" />',
    `<title>Decision DNA Report · ${wsName}</title>`,
    `<style>${REPORT_CSS}</style>`,
    '</head>',
    '<body>',
    '<header class="report-cover">',
    '<div class="brand">Lazynext · Decision DNA</div>',
    `<h1>${wsName}</h1>`,
    `<p class="generated">Generated ${generated}</p>`,
    summaryCards(report),
    '</header>',
    banner,
    toc,
    main,
    '<footer class="report-footer">',
    `<span>${wsName}</span>`,
    '<span>lazynext.com</span>',
    '</footer>',
    `<script>${AUTO_PRINT_SCRIPT}</script>`,
    '</body>',
    '</html>',
  ].join('')
}
