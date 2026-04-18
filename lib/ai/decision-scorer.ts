import { callLazyMind, hasAIKeys } from './lazymind'
import { DECISION_QUALITY_PROMPT } from './prompts'
import { computeDecisionQualityScore } from './decision-quality'
import type { DecisionScoreBreakdown } from '@/lib/db/schema'

export interface ScoreInput {
  question: string
  resolution?: string | null
  rationale?: string | null
  optionsConsidered?: string[]
  decisionType?: string | null
  riskNotes?: string | null
}

export interface ScoreResult {
  overall: number
  breakdown: DecisionScoreBreakdown
  rationale: string
  modelVersion: string
  source: 'ai' | 'heuristic'
}

export const DECISION_SCORER_MODEL = 'groq:llama-3.3-70b-v2'

const DIMENSION_WEIGHT = 0.25

function aggregate(breakdown: DecisionScoreBreakdown): number {
  const sum =
    breakdown.clarity * DIMENSION_WEIGHT +
    breakdown.data_quality * DIMENSION_WEIGHT +
    breakdown.risk_awareness * DIMENSION_WEIGHT +
    breakdown.alternatives_considered * DIMENSION_WEIGHT
  return Math.round(Math.max(0, Math.min(100, sum)))
}

function clamp(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round(Math.max(0, Math.min(100, v)))
}

// LLMs (especially Llama via Groq) often wrap JSON responses in markdown fences
// even when explicitly told not to. Strip fences, leading/trailing prose, and
// anything outside the outermost { ... } block before parsing.
function extractJson(raw: string): string {
  let s = raw.trim()
  // Strip ``` or ```json fences
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  // Grab first { ... last } in case there's leading/trailing prose
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1)
  }
  return s.trim()
}

function heuristicBreakdown(input: ScoreInput): DecisionScoreBreakdown {
  const overall = computeDecisionQualityScore(input)
  const rationaleLen = input.rationale?.trim().length ?? 0
  const optionCount = input.optionsConsidered?.length ?? 0
  const questionLen = input.question?.trim().length ?? 0
  const riskHit =
    (input.rationale?.toLowerCase().includes('revers') ?? false) ||
    (input.riskNotes && input.riskNotes.trim().length > 0) ||
    input.decisionType === 'experimental'

  return {
    clarity: Math.min(100, Math.round(questionLen * 1.5 + Math.min(rationaleLen / 4, 40))),
    data_quality: Math.min(100, Math.round(rationaleLen / 3)),
    risk_awareness: riskHit ? Math.min(100, Math.round(overall * 0.9)) : Math.min(40, Math.round(overall / 2)),
    alternatives_considered: Math.min(100, optionCount * 30),
  }
}

// Structured event log for scorer outcomes. Pipe to your log aggregator
// (Axiom, Datadog, Vercel, etc.) and alert on a spike in source:"heuristic"
// with fallback_cause != "no_ai_keys" — that's Llama returning garbage again.
function logScoreEvent(evt: {
  source: 'ai' | 'heuristic'
  provider?: 'groq' | 'together'
  model_version: string
  duration_ms: number
  fallback_cause?: 'no_ai_keys' | 'llm_call_failed' | 'json_parse_failed'
  error_message?: string
}) {
  // Single-line JSON so log aggregators can parse without a formatter.
  // Keyed with a stable prefix for easy filtering: `grep decision_scorer`.
  try {
    // eslint-disable-next-line no-console
    console.info(
      'decision_scorer ' +
        JSON.stringify({ event: 'score_decision', ...evt, ts: new Date().toISOString() })
    )
  } catch {
    // Logging should never crash the scorer.
  }
}

export async function scoreDecision(input: ScoreInput): Promise<ScoreResult> {
  const heuristic = heuristicBreakdown(input)
  const started = Date.now()

  if (!hasAIKeys) {
    logScoreEvent({
      source: 'heuristic',
      model_version: 'heuristic:v1',
      duration_ms: Date.now() - started,
      fallback_cause: 'no_ai_keys',
    })
    return {
      overall: aggregate(heuristic),
      breakdown: heuristic,
      rationale: 'Heuristic score — AI provider not configured.',
      modelVersion: 'heuristic:v1',
      source: 'heuristic',
    }
  }

  const payload = JSON.stringify({
    question: input.question,
    resolution: input.resolution ?? null,
    rationale: input.rationale ?? null,
    alternatives: input.optionsConsidered ?? [],
    decision_type: input.decisionType ?? null,
    risk_notes: input.riskNotes ?? null,
  })

  // Split AI call and JSON parse into distinct try blocks so we can tell
  // WHICH failed when we fall back — the signal a prod operator needs to
  // diagnose "LLM down" vs "LLM returning garbage we can't parse".
  let aiContent: string
  let provider: 'groq' | 'together'
  try {
    const ai = await callLazyMind(DECISION_QUALITY_PROMPT, payload, 350)
    aiContent = ai.content
    provider = ai.provider
  } catch (err) {
    logScoreEvent({
      source: 'heuristic',
      model_version: 'heuristic:v1',
      duration_ms: Date.now() - started,
      fallback_cause: 'llm_call_failed',
      error_message: err instanceof Error ? err.message : String(err),
    })
    return {
      overall: aggregate(heuristic),
      breakdown: heuristic,
      rationale: 'Heuristic score — AI call failed.',
      modelVersion: 'heuristic:v1',
      source: 'heuristic',
    }
  }

  try {
    const parsed = JSON.parse(extractJson(aiContent)) as {
      clarity?: unknown
      data_quality?: unknown
      risk_awareness?: unknown
      alternatives_considered?: unknown
      rationale?: unknown
    }
    const breakdown: DecisionScoreBreakdown = {
      clarity: clamp(parsed.clarity),
      data_quality: clamp(parsed.data_quality),
      risk_awareness: clamp(parsed.risk_awareness),
      alternatives_considered: clamp(parsed.alternatives_considered),
    }
    const modelVersion = `${DECISION_SCORER_MODEL}:${provider}`
    logScoreEvent({
      source: 'ai',
      provider,
      model_version: modelVersion,
      duration_ms: Date.now() - started,
    })
    return {
      overall: aggregate(breakdown),
      breakdown,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      modelVersion,
      source: 'ai',
    }
  } catch (err) {
    logScoreEvent({
      source: 'heuristic',
      provider,
      model_version: 'heuristic:v1',
      duration_ms: Date.now() - started,
      fallback_cause: 'json_parse_failed',
      error_message: err instanceof Error ? err.message : String(err),
    })
    return {
      overall: aggregate(heuristic),
      breakdown: heuristic,
      rationale: 'Heuristic score — AI returned unparseable JSON.',
      modelVersion: 'heuristic:v1',
      source: 'heuristic',
    }
  }
}
