import { requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { scoreDecision } from '@/lib/ai/decision-scorer'
import { incrementWmsFor } from '@/lib/wms'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { notifyWorkspaceMembers } from '@/lib/data/notifications'
import { recordAudit } from '@/lib/data/audit-log'
import { runAutomations } from '@/lib/data/automations'
import { PLAN_LIMITS } from '@/lib/utils/constants'

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
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const { data: results, error } = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  // Bearer-or-cookie auth bound to the body's workspaceId. Bearer
  // requests must additionally hold the 'write' scope; read-only keys
  // are rejected with 403 INSUFFICIENT_SCOPE.
  const auth = await requireWorkspaceAuth(req, parsed.data.workspaceId)
  if (!auth.ok) return auth.response
  const scopeFail = requireScope(auth, 'write')
  if (scopeFail) return scopeFail.response

  const { userId } = auth

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  // Plan-gate the decision count. Free plan caps at 20 logged
  // decisions per workspace — that's the marketing claim and now it's
  // enforced. Paid tiers are uncapped (-1 in PLAN_LIMITS).
  const { data: planRow } = await db
    .from('workspaces')
    .select('plan')
    .eq('id', parsed.data.workspaceId)
    .single()
  const plan = ((planRow as { plan?: string } | null)?.plan ?? 'free') as keyof typeof PLAN_LIMITS
  const decisionLimit = PLAN_LIMITS[plan]?.decisions ?? -1
  if (decisionLimit !== -1) {
    const { count } = await db
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', parsed.data.workspaceId)
    if ((count ?? 0) >= decisionLimit) {
      return NextResponse.json(
        {
          error: 'PLAN_LIMIT_REACHED',
          variant: 'decision-limit',
          message: `Free workspaces are capped at ${decisionLimit} decisions. Upgrade to log more.`,
        },
        { status: 402 },
      )
    }
  }

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
// Fan out a workspace-wide notification (every member except the actor).
  // Non-blocking: notification failures must not 500 the decision write.
  const { data: workspace } = await db.from('workspaces').select('slug').eq('id', parsed.data.workspaceId).maybeSingle()
  const slug = (workspace as { slug?: string } | null)?.slug
  await notifyWorkspaceMembers({
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    type: 'decision_logged',
    title: 'New decision logged',
    body: parsed.data.question.slice(0, 280),
    link: slug ? `/workspace/${slug}/decisions/${decision.id}` : null,
    relatedDecisionId: decision.id,
  }).catch(() => undefined)

  await recordAudit({
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    action: 'decision.create',
    resourceType: 'decision',
    resourceId: decision.id,
    metadata: {
      question: parsed.data.question.slice(0, 500),
      decisionType: parsed.data.decisionType ?? null,
      qualityScore: scoreResult.overall,
    },
    request: req,
  }).catch(() => undefined)

  await runAutomations({
    type: 'decision.logged',
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    decisionId: decision.id,
    question: parsed.data.question,
    decisionType: parsed.data.decisionType ?? null,
    qualityScore: scoreResult.overall,
    workspaceSlug: slug ?? null,
  }).catch(() => undefined)

  return NextResponse.json({ data: decision, error: null }, { status: 201 })
}
