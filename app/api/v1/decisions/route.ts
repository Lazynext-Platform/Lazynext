import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { scoreDecision } from '@/lib/ai/decision-scorer'
import { incrementWmsFor } from '@/lib/wms'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  question: z.string().min(1),
  resolution: z.string().optional(),
  rationale: z.string().optional(),
  optionsConsidered: z.array(z.string()).optional(),
  decisionType: z.enum(['reversible', 'irreversible', 'experimental']).optional(),
  tags: z.array(z.string()).optional(),
  nodeId: z.string().uuid().optional(),
  expectedBy: z.string().datetime().optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

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

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const scoreResult = await scoreDecision({
    question: parsed.data.question,
    resolution: parsed.data.resolution,
    rationale: parsed.data.rationale,
    optionsConsidered: parsed.data.optionsConsidered,
    decisionType: parsed.data.decisionType,
  })

  const publicSlug = parsed.data.isPublic
    ? Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    : null

  const { data: decision, error } = await db.from('decisions').insert({
    workspace_id: parsed.data.workspaceId,
    question: parsed.data.question,
    resolution: parsed.data.resolution || null,
    rationale: parsed.data.rationale || null,
    options_considered: parsed.data.optionsConsidered || [],
    decision_type: parsed.data.decisionType || null,
    tags: parsed.data.tags || [],
    node_id: parsed.data.nodeId || null,
    quality_score: scoreResult.overall,
    quality_feedback: scoreResult.rationale,
    quality_scored_at: new Date().toISOString(),
    score_breakdown: scoreResult.breakdown,
    score_model_version: scoreResult.modelVersion,
    score_rationale: scoreResult.rationale,
    expected_by: parsed.data.expectedBy || null,
    is_public: parsed.data.isPublic ?? false,
    public_slug: publicSlug,
    made_by: userId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // WMS: a new decision increments the workspace's maturity.
  await incrementWmsFor(parsed.data.workspaceId, 'decision_created').catch(() => undefined)
  if (scoreResult.overall > 0) {
    // noop; future calibration hook
  }

  return NextResponse.json({ data: decision, error: null }, { status: 201 })
}
