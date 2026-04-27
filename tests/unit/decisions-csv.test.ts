import { describe, it, expect } from 'vitest'
import { decisionsToCsv } from '@/lib/utils/decisions-csv'
import type { Decision } from '@/lib/db/schema'

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 'd1',
    workspace_id: 'w1',
    node_id: null,
    question: 'Should we ship?',
    resolution: 'Yes',
    rationale: 'Tests pass',
    status: 'decided',
    options_considered: ['Yes', 'No'],
    information_at_time: null,
    stakeholders: ['ava'],
    decision_type: 'reversible',
    outcome: 'good',
    outcome_tagged_by: null,
    outcome_tagged_at: null,
    outcome_notes: null,
    outcome_confidence: null,
    quality_score: 87,
    quality_feedback: null,
    quality_scored_at: null,
    score_breakdown: null,
    score_model_version: null,
    score_rationale: null,
    expected_by: null,
    is_public: false,
    public_slug: null,
    outcome_reminder_sent_at: null,
    tags: ['ship'],
    made_by: 'u1',
    created_at: '2026-04-27T00:00:00Z',
    updated_at: '2026-04-27T00:00:00Z',
    ...overrides,
  }
}

describe('decisionsToCsv', () => {
  it('emits an RFC 4180-ish header row when given an empty list', () => {
    const out = decisionsToCsv([])
    const lines = out.split('\r\n')
    expect(lines[0]).toContain('id,created_at,made_by,question')
    expect(lines[lines.length - 1]).toBe('')
  })

  it('serializes a basic row with no escaping needed', () => {
    const out = decisionsToCsv([makeDecision()])
    expect(out).toContain('d1,2026-04-27T00:00:00Z,u1,Should we ship?')
    expect(out).toContain(',87,')
  })

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const out = decisionsToCsv([
      makeDecision({
        question: 'Should "we", ship?',
        rationale: 'Line one\nLine two',
      }),
    ])
    // Embedded quotes get doubled.
    expect(out).toContain('"Should ""we"", ship?"')
    // Newlines force the cell into a quoted form.
    expect(out).toContain('"Line one\nLine two"')
  })

  it('joins array fields with semicolons', () => {
    const out = decisionsToCsv([
      makeDecision({ tags: ['ship', 'q2', 'urgent'], stakeholders: ['ava', 'sam'] }),
    ])
    expect(out).toContain('ship; q2; urgent')
    expect(out).toContain('ava; sam')
  })
})
