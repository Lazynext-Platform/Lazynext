import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'
import { callLazyMind } from '@/lib/ai/lazymind'
import { DECISION_QUALITY_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: decision, error: fetchError } = await db
    .from('decisions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const prompt = JSON.stringify({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: decision.options_considered,
    decisionType: decision.decision_type,
  })

  let qualityScore = computeDecisionQualityScore({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: (decision.options_considered as string[]) || [],
    decisionType: decision.decision_type,
  })
  let qualityFeedback = ''

  try {
    const aiResponse = await callLazyMind(DECISION_QUALITY_PROMPT, prompt, 200)
    const parsed = JSON.parse(aiResponse.content)
    qualityScore = parsed.score
    qualityFeedback = parsed.feedback
  } catch {
    // Fall back to local score silently
  }

  await db
    .from('decisions')
    .update({ quality_score: qualityScore, quality_feedback: qualityFeedback, quality_scored_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ data: { qualityScore, qualityFeedback }, error: null })
}
