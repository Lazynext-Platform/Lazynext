import { describe, it, expect, vi, beforeEach } from 'vitest'

// The decision scorer calls an LLM and parses JSON from the response. Llama
// (via Groq) frequently wraps JSON in markdown fences even when asked not to.
// These tests lock in robust parsing — regressions here silently downgrade
// AI scoring to heuristic-only.

vi.mock('@/lib/ai/lazymind', () => ({
  hasAIKeys: true,
  callLazyMind: vi.fn(),
}))

import { callLazyMind } from '@/lib/ai/lazymind'
import { scoreDecision } from '@/lib/ai/decision-scorer'

const mockedCall = vi.mocked(callLazyMind)

const SAMPLE_INPUT = {
  question: 'Ship the new pricing page now or wait until post-launch?',
  resolution: 'Ship now',
  rationale: 'Traffic spike from Product Hunt would be wasted on stale copy.',
  optionsConsidered: ['Ship now', 'Wait until post-launch', 'Partial ship behind flag'],
  decisionType: 'reversible',
}

const VALID_JSON = '{"clarity": 82, "data_quality": 64, "risk_awareness": 71, "alternatives_considered": 88, "rationale": "Strong clarity and alternatives, weaker data evidence."}'

describe('scoreDecision — JSON parsing robustness', () => {
  beforeEach(() => {
    mockedCall.mockReset()
  })

  it('parses plain JSON', async () => {
    mockedCall.mockResolvedValue({ content: VALID_JSON, provider: 'groq' })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('ai')
    expect(result.breakdown.clarity).toBe(82)
    expect(result.breakdown.data_quality).toBe(64)
    expect(result.overall).toBeGreaterThan(0)
  })

  it('strips ```json ... ``` markdown fences', async () => {
    mockedCall.mockResolvedValue({
      content: '```json\n' + VALID_JSON + '\n```',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('ai')
    expect(result.breakdown.clarity).toBe(82)
  })

  it('strips bare ``` fences', async () => {
    mockedCall.mockResolvedValue({
      content: '```\n' + VALID_JSON + '\n```',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('ai')
    expect(result.breakdown.alternatives_considered).toBe(88)
  })

  it('extracts JSON from leading/trailing prose', async () => {
    mockedCall.mockResolvedValue({
      content: 'Sure! Here is the score: ' + VALID_JSON + ' Let me know if you need anything else.',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('ai')
    expect(result.breakdown.risk_awareness).toBe(71)
  })

  it('clamps out-of-range scores to 0–100', async () => {
    mockedCall.mockResolvedValue({
      content: '{"clarity": 150, "data_quality": -20, "risk_awareness": 50, "alternatives_considered": "not-a-number"}',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.breakdown.clarity).toBe(100)
    expect(result.breakdown.data_quality).toBe(0)
    expect(result.breakdown.alternatives_considered).toBe(0)
  })

  it('falls back to heuristic when AI returns unparseable garbage', async () => {
    mockedCall.mockResolvedValue({
      content: 'I cannot help with that request.',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('heuristic')
    expect(result.overall).toBeGreaterThanOrEqual(0)
    expect(result.overall).toBeLessThanOrEqual(100)
  })

  it('falls back to heuristic when AI throws', async () => {
    mockedCall.mockRejectedValue(new Error('Groq timeout'))
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.source).toBe('heuristic')
  })
})

describe('scoreDecision — weighted aggregate', () => {
  beforeEach(() => {
    mockedCall.mockReset()
  })

  it('averages the 4 dimensions with equal 0.25 weights', async () => {
    mockedCall.mockResolvedValue({
      content: '{"clarity": 100, "data_quality": 100, "risk_awareness": 0, "alternatives_considered": 0, "rationale": ""}',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.overall).toBe(50)
  })

  it('perfect scores round to 100', async () => {
    mockedCall.mockResolvedValue({
      content: '{"clarity": 100, "data_quality": 100, "risk_awareness": 100, "alternatives_considered": 100}',
      provider: 'groq',
    })
    const result = await scoreDecision(SAMPLE_INPUT)
    expect(result.overall).toBe(100)
  })
})

describe('scoreDecision — observability logs', () => {
  // These tests lock in the structured log shape so prod log aggregators
  // can reliably alert on a spike in json_parse_failed (= Llama regressed
  // to unparseable output) vs llm_call_failed (= Groq/Together outage).
  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedCall.mockReset()
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  function lastLogPayload(): Record<string, unknown> {
    const call = infoSpy.mock.calls.at(-1)
    if (!call) throw new Error('no console.info calls captured')
    const raw = String(call[0])
    const jsonStart = raw.indexOf('{')
    return JSON.parse(raw.slice(jsonStart))
  }

  it('emits source=ai on successful scoring', async () => {
    mockedCall.mockResolvedValue({ content: VALID_JSON, provider: 'groq' })
    await scoreDecision(SAMPLE_INPUT)
    const payload = lastLogPayload()
    expect(payload.source).toBe('ai')
    expect(payload.provider).toBe('groq')
    expect(payload.model_version).toContain('groq')
    expect(payload.fallback_cause).toBeUndefined()
  })

  it('emits fallback_cause=llm_call_failed when the AI call throws', async () => {
    mockedCall.mockRejectedValue(new Error('Groq 503'))
    await scoreDecision(SAMPLE_INPUT)
    const payload = lastLogPayload()
    expect(payload.source).toBe('heuristic')
    expect(payload.fallback_cause).toBe('llm_call_failed')
    expect(payload.error_message).toContain('Groq 503')
  })

  it('emits fallback_cause=json_parse_failed when the AI returns garbage', async () => {
    mockedCall.mockResolvedValue({ content: 'I refuse to answer.', provider: 'groq' })
    await scoreDecision(SAMPLE_INPUT)
    const payload = lastLogPayload()
    expect(payload.source).toBe('heuristic')
    expect(payload.fallback_cause).toBe('json_parse_failed')
    expect(payload.provider).toBe('groq')
  })
})
