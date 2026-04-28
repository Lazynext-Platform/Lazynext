import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { scoreDecision } from '@/lib/ai/decision-scorer'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' },
      { status: 503 }
    )
  }

  const { data: decision, error: fetchError } = await db
    .from('decisions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const authorized = await verifyWorkspaceMember(userId, decision.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const result = await scoreDecision({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: (decision.options_considered as string[]) || [],
    decisionType: decision.decision_type,
    riskNotes: decision.outcome_notes,
  })

  await db
    .from('decisions')
    .update({
      quality_score: result.overall,
      quality_feedback: result.rationale,
      quality_scored_at: new Date().toISOString(),
      score_breakdown: result.breakdown,
      score_model_version: result.modelVersion,
      score_rationale: result.rationale,
    })
    .eq('id', params.id)

  return NextResponse.json({
    data: {
      qualityScore: result.overall,
      qualityFeedback: result.rationale,
      breakdown: result.breakdown,
      source: result.source,
    },
    error: null,
  })
}
