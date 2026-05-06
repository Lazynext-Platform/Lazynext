import { describe, it, expect } from 'vitest'
import {
  renderDecisionReportHtml,
  escapeHtml,
} from '@/lib/reports/decision-html'
import type { DecisionReport, DecisionReportRow } from '@/lib/data/decision-report'

function makeReport(overrides: Partial<DecisionReport> = {}): DecisionReport {
  const baseDecision: DecisionReportRow = {
    id: 'd-1',
    question: 'Ship now or wait?',
    resolution: 'Ship now',
    rationale: 'Traffic spike from Product Hunt would be wasted.',
    status: 'decided',
    decisionType: 'reversible',
    options: ['Ship now', 'Wait'],
    outcome: 'success',
    outcomeNotes: 'Conversion lifted 18%.',
    qualityScore: 82,
    scoreBreakdown: {
      clarity: 80,
      dataQuality: 65,
      riskAwareness: 90,
      alternativesConsidered: 88,
    },
    scoreModelVersion: 'groq:llama-3.3-70b-v2',
    createdAt: '2026-04-01T10:00:00.000Z',
    qualityScoredAt: '2026-04-01T10:01:00.000Z',
    outcomeTaggedAt: '2026-04-15T12:00:00.000Z',
  }
  return {
    workspace: { id: 'w1', name: 'Acme', plan: 'starter' },
    generatedAt: '2026-05-06T00:00:00.000Z',
    decisions: [baseDecision],
    truncated: false,
    totalCount: 1,
    summary: {
      avgQuality: 82,
      byOutcome: { success: 1, partial: 0, failed: 0, pending: 0 },
      byType: { reversible: 1, irreversible: 0, experimental: 0, unknown: 0 },
    },
    ...overrides,
  }
}

describe('escapeHtml', () => {
  it('escapes the standard XSS vectors', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(escapeHtml('a "b" \'c\' & d')).toBe('a &quot;b&quot; &#39;c&#39; &amp; d')
  })
})

describe('renderDecisionReportHtml', () => {
  it('produces a complete <html> document with workspace name in the title and cover', () => {
    const html = renderDecisionReportHtml(makeReport())
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>Decision DNA Report · Acme</title>')
    expect(html).toContain('<h1>Acme</h1>')
    expect(html).toContain('Lazynext · Decision DNA')
  })

  it('shows the truncated banner when payload.truncated=true', () => {
    const html = renderDecisionReportHtml(
      makeReport({ truncated: true, totalCount: 654 }),
    )
    expect(html).toContain('class="banner banner-truncated"')
    expect(html).toContain('1 of 654')
  })

  it('hides the truncated banner when payload.truncated=false', () => {
    const html = renderDecisionReportHtml(makeReport({ truncated: false }))
    expect(html).not.toContain('<aside class="banner banner-truncated"')
  })

  it('renders one <article> per decision', () => {
    const a: DecisionReportRow = {
      id: 'a',
      question: 'A?',
      resolution: null,
      rationale: null,
      status: 'open',
      decisionType: null,
      options: [],
      outcome: 'pending',
      outcomeNotes: null,
      qualityScore: null,
      scoreBreakdown: null,
      scoreModelVersion: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      qualityScoredAt: null,
      outcomeTaggedAt: null,
    }
    const html = renderDecisionReportHtml(
      makeReport({ decisions: [a, { ...a, id: 'b', question: 'B?' }] }),
    )
    const articles = html.match(/<article class="decision"/g) ?? []
    expect(articles.length).toBe(2)
  })

  it('omits the score block when scoreBreakdown is null', () => {
    const noScore = makeReport({
      decisions: [
        {
          ...makeReport().decisions[0],
          qualityScore: null,
          scoreBreakdown: null,
        },
      ],
    })
    const html = renderDecisionReportHtml(noScore)
    expect(html).not.toContain('Decision DNA score')
    expect(html).not.toContain('<span class="score-bar-fill"')
  })

  it('escapes user-supplied fields (XSS defense)', () => {
    const evil = makeReport({
      workspace: { id: 'w1', name: '<img src=x>', plan: 'starter' },
      decisions: [
        {
          ...makeReport().decisions[0],
          question: '<script>alert(1)</script>',
          rationale: 'a "b" & c',
        },
      ],
    })
    const html = renderDecisionReportHtml(evil)
    expect(html).not.toContain('<img src=x>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;img src=x&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('a &quot;b&quot; &amp; c')
  })

  it('renders a "no decisions" message on an empty report', () => {
    const empty = makeReport({
      decisions: [],
      totalCount: 0,
      summary: {
        avgQuality: -1,
        byOutcome: { success: 0, partial: 0, failed: 0, pending: 0 },
        byType: { reversible: 0, irreversible: 0, experimental: 0, unknown: 0 },
      },
    })
    const html = renderDecisionReportHtml(empty)
    expect(html).toContain('No decisions in this workspace yet')
    // avgQuality -1 sentinel renders as a dash, not "-1/100".
    expect(html).not.toContain('-1/100')
  })

  it('includes a TOC linking each decision by id', () => {
    const html = renderDecisionReportHtml(makeReport())
    expect(html).toContain('class="toc"')
    expect(html).toContain('href="#d-d-1"')
  })

  it('includes the auto-print script', () => {
    const html = renderDecisionReportHtml(makeReport())
    expect(html).toContain('window.print()')
  })
})
