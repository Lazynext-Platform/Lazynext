import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { checkAiQuota, recordAiUsage } from '@/lib/data/ai-usage'
import {
  generateWorkflow,
  WorkflowGenerationError,
} from '@/lib/ai/workflow-generator'
import { recordAudit } from '@/lib/data/audit-log'
import {
  buildResponseHeaders,
  newRequestId,
  headersToObject,
} from '@/lib/utils/api-headers'
import { reportApiError } from '@/lib/utils/api-sentry'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/ai/workflow
 *
 * Generates a workflow graph (nodes + edges) from a freeform prompt
 * via the LazyMind LLM. Cookie-session only at v1 (matches /ai/generate
 * scope; promote to bearer + scope after telemetry review per
 * docs/features/41-ai-workflow-generation/architecture.md).
 *
 * Response: { data: { nodes, edges, rationale, provider, model }, error: null }
 */

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  workspaceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const requestId = newRequestId()
  const baseHeaders = headersToObject(buildResponseHeaders({ requestId }))

  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401, headers: baseHeaders },
    )
  }

  // Per-minute burst cap (AI bucket — same as /ai/generate, /ai/chat).
  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) {
    const r = rateLimitResponse({
      resetAt: rl.resetAt,
      limit: rl.limit,
      remaining: rl.remaining,
    })
    for (const [k, v] of Object.entries(baseHeaders)) r.headers.set(k, v)
    return r
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON' },
      { status: 400, headers: baseHeaders },
    )
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400, headers: baseHeaders },
    )
  }
  const { prompt, workspaceId } = parsed.data

  const member = await verifyWorkspaceMember(userId, workspaceId)
  if (!member) {
    return NextResponse.json(
      { error: 'FORBIDDEN' },
      { status: 403, headers: baseHeaders },
    )
  }

  // Daily AI quota — same plan-gate as /ai/generate. 1 unit per call,
  // not per-node, per architecture decision #2.
  const quota = await checkAiQuota(userId, workspaceId)
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: 'PLAN_LIMIT_REACHED',
        variant: 'ai-limit',
        message: `You've used ${quota.used} of ${quota.limit} LazyMind queries for today. Upgrade for a larger daily quota.`,
        plan: quota.plan,
        used: quota.used,
        limit: quota.limit,
      },
      { status: 402, headers: baseHeaders },
    )
  }

  const startedAt = Date.now()
  try {
    const graph = await generateWorkflow({ prompt, workspaceId })
    void recordAiUsage(userId, workspaceId)

    // Best-effort audit. Never blocks the success response.
    void recordAudit({
      workspaceId,
      actorId: userId,
      action: 'ai.workflow.generated',
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: {
        prompt_length: prompt.length,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
        provider: graph.provider,
        model: graph.model,
        duration_ms: Date.now() - startedAt,
      },
      request: req,
    })

    return NextResponse.json(
      { data: graph, error: null },
      { status: 200, headers: baseHeaders },
    )
  } catch (err) {
    if (err instanceof WorkflowGenerationError) {
      // AI_NOT_CONFIGURED is a 503 (capability missing); SCHEMA_INVALID
      // and AI_CALL_FAILED are 502 (upstream/dependency failure).
      const status = err.code === 'AI_NOT_CONFIGURED' ? 503 : 502
      const code =
        err.code === 'AI_NOT_CONFIGURED'
          ? 'AI_UNAVAILABLE'
          : 'WORKFLOW_GENERATION_FAILED'
      reportApiError(err, {
        route: '/api/v1/ai/workflow',
        method: 'POST',
        requestId,
        userId,
        workspaceId,
        extra: { code: err.code },
      })
      return NextResponse.json(
        { error: code, message: err.message },
        { status, headers: baseHeaders },
      )
    }
    reportApiError(err, {
      route: '/api/v1/ai/workflow',
      method: 'POST',
      requestId,
      userId,
      workspaceId,
    })
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500, headers: baseHeaders },
    )
  }
}
