import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
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
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const { data: results, error } = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

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

  const { data: decision, error } = await db.from('decisions').insert({
    workspace_id: parsed.data.workspaceId,
    question: parsed.data.question,
    resolution: parsed.data.resolution || null,
    rationale: parsed.data.rationale || null,
    options_considered: parsed.data.optionsConsidered || [],
    decision_type: parsed.data.decisionType || null,
    tags: parsed.data.tags || [],
    node_id: parsed.data.nodeId || null,
    quality_score: qualityScore,
    quality_scored_at: new Date().toISOString(),
    made_by: userId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: decision, error: null }, { status: 201 })
}
