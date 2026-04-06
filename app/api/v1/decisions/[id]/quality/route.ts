import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { decisions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'
import { callLazyMind } from '@/lib/ai/lazymind'
import { DECISION_QUALITY_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const decision = await db.query.decisions.findFirst({
    where: eq(decisions.id, params.id),
  })

  if (!decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const prompt = JSON.stringify({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: decision.optionsConsidered,
    decisionType: decision.decisionType,
  })

  let qualityScore = computeDecisionQualityScore({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: (decision.optionsConsidered as string[]) || [],
    decisionType: decision.decisionType,
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

  await db.update(decisions)
    .set({ qualityScore, qualityFeedback, qualityScoredAt: new Date() })
    .where(eq(decisions.id, params.id))

  return NextResponse.json({ data: { qualityScore, qualityFeedback }, error: null })
}
