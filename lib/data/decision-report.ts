import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import type { Decision } from '@/lib/db/schema'

/**
 * Decision DNA report payload. Pure data — see `lib/reports/decision-html.ts`
 * for the print-optimized renderer that consumes this.
 */
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
  scoreBreakdown: {
    clarity: number
    dataQuality: number
    riskAwareness: number
    alternativesConsidered: number
  } | null
  scoreModelVersion: string | null
  createdAt: string
  qualityScoredAt: string | null
  outcomeTaggedAt: string | null
}

export interface DecisionReport {
  workspace: { id: string; name: string; plan: string }
  generatedAt: string
  decisions: DecisionReportRow[]
  /** True when the workspace had more than `cap` decisions and we trimmed. */
  truncated: boolean
  /** Total raw count BEFORE truncation. Useful for a banner. */
  totalCount: number
  summary: {
    avgQuality: number
    byOutcome: { success: number; partial: number; failed: number; pending: number }
    byType: {
      reversible: number
      irreversible: number
      experimental: number
      unknown: number
    }
  }
}

/**
 * Hard cap on rows per report. Architecture decision #2:
 *   - Covers >99% of real workspaces.
 *   - Keeps the response payload under ~1.5MB.
 *   - Anything beyond this is its own UX problem (paginated PDFs are
 *     a follow-up if 500 ever proves too low in practice).
 */
export const DECISION_REPORT_CAP = 500

interface WorkspaceRow {
  id: string
  name: string
  plan: string | null
}

function mapRow(row: Decision): DecisionReportRow {
  // The DB column shape is snake_case — flatten + camelize at the
  // boundary so the renderer doesn't have to know SQL conventions.
  const breakdown = row.score_breakdown
    ? {
        clarity: row.score_breakdown.clarity,
        dataQuality: row.score_breakdown.data_quality,
        riskAwareness: row.score_breakdown.risk_awareness,
        alternativesConsidered: row.score_breakdown.alternatives_considered,
      }
    : null
  return {
    id: row.id,
    question: row.question,
    resolution: row.resolution,
    rationale: row.rationale,
    status: row.status,
    decisionType: row.decision_type,
    options: row.options_considered ?? [],
    outcome: row.outcome,
    outcomeNotes: row.outcome_notes,
    qualityScore: row.quality_score,
    scoreBreakdown: breakdown,
    scoreModelVersion: row.score_model_version,
    createdAt: row.created_at,
    qualityScoredAt: row.quality_scored_at,
    outcomeTaggedAt: row.outcome_tagged_at,
  }
}

function summarize(rows: DecisionReportRow[]): DecisionReport['summary'] {
  const byOutcome = { success: 0, partial: 0, failed: 0, pending: 0 }
  const byType = { reversible: 0, irreversible: 0, experimental: 0, unknown: 0 }
  let qualitySum = 0
  let qualityCount = 0
  for (const r of rows) {
    if (r.outcome in byOutcome) (byOutcome as Record<string, number>)[r.outcome]++
    if (r.decisionType && r.decisionType in byType) {
      ;(byType as Record<string, number>)[r.decisionType]++
    } else {
      byType.unknown++
    }
    if (typeof r.qualityScore === 'number') {
      qualitySum += r.qualityScore
      qualityCount++
    }
  }
  return {
    // -1 sentinel for "no scored decisions" — easier on the renderer
    // than a null branch and never collides with a real 0..100 score.
    avgQuality: qualityCount === 0 ? -1 : Math.round(qualitySum / qualityCount),
    byOutcome,
    byType,
  }
}

/**
 * Load a Decision DNA report payload for a workspace.
 *
 * Caller must have already verified workspace membership. This loader
 * does NOT enforce auth — it's a pure data-fetch step.
 *
 * Returns `null` when:
 *   - DB env vars aren't configured, OR
 *   - the workspace doesn't exist (no other surface needs to disambiguate
 *     "no rows" from "no workspace", so a single null is enough).
 */
export async function loadDecisionReport(
  workspaceId: string,
): Promise<DecisionReport | null> {
  if (!hasValidDatabaseUrl) return null

  const wsRes = await db
    .from('workspaces')
    .select('id, name, plan')
    .eq('id', workspaceId)
    .maybeSingle()
  const ws = wsRes.data as WorkspaceRow | null
  if (!ws) return null

  // exact head count first (cheap), then fetch up to the cap.
  const headRes = await db
    .from('decisions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
  const totalCount = headRes.count ?? 0

  const dataRes = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(DECISION_REPORT_CAP)
  const decisions = ((dataRes.data ?? []) as Decision[]).map(mapRow)

  return {
    workspace: { id: ws.id, name: ws.name, plan: ws.plan ?? 'free' },
    generatedAt: new Date().toISOString(),
    decisions,
    truncated: totalCount > DECISION_REPORT_CAP,
    totalCount,
    summary: summarize(decisions),
  }
}
