import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { decisions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  question: z.string().min(1),
  resolution: z.string().optional(),
  rationale: z.string().optional(),
  optionsConsidered: z.array(z.string()).optional(),
  decisionType: z.enum(['reversible', 'irreversible', 'experimental']).optional(),
  tags: z.array(z.string()).optional(),
  nodeId: z.string().uuid().optional(),
})

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const status = url.searchParams.get('status')

  let query = db.select().from(decisions)
    .where(eq(decisions.workspaceId, workspaceId))
    .orderBy(desc(decisions.createdAt))

  const results = await query
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const qualityScore = computeDecisionQualityScore({
    question: parsed.data.question,
    resolution: parsed.data.resolution,
    rationale: parsed.data.rationale,
    optionsConsidered: parsed.data.optionsConsidered,
    decisionType: parsed.data.decisionType,
  })

  const [decision] = await db.insert(decisions).values({
    ...parsed.data,
    optionsConsidered: parsed.data.optionsConsidered || [],
    tags: parsed.data.tags || [],
    qualityScore,
    qualityScoredAt: new Date(),
    madeBy: userId,
  }).returning()

  return NextResponse.json({ data: decision, error: null }, { status: 201 })
}
