import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { callLazyMind } from '@/lib/ai/lazymind'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { checkAiQuota, recordAiUsage } from '@/lib/data/ai-usage'

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(['node_content', 'decision_rationale', 'doc_draft', 'task_breakdown']),
  context: z.record(z.string(), z.unknown()).optional(),
  workspaceId: z.string().uuid().optional(),
})

const systemPrompts: Record<string, string> = {
  node_content: 'You are LazyMind. Generate content for a workflow node. Return clear, actionable text.',
  decision_rationale: 'You are LazyMind. Help write a decision rationale. Include options considered, trade-offs, and a recommendation. Be concise.',
  doc_draft: 'You are LazyMind. Draft a document based on the user\'s description. Use markdown formatting. Keep it focused and professional.',
  task_breakdown: 'You are LazyMind. Break down the described work into 3-7 actionable subtasks. Return as a numbered list.',
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { prompt, type, context, workspaceId } = parsed.data

  // Plan-gate the daily AI quota when scoped to a workspace. Same
  // pattern as `/api/v1/ai/chat`: callers that don't pass
  // `workspaceId` get the per-minute burst cap above and nothing else.
  if (workspaceId) {
    const ok = await verifyWorkspaceMember(userId, workspaceId)
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
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
        { status: 402 },
      )
    }
  }

  const systemPrompt = systemPrompts[type]
  const userMessage = context
    ? `${prompt}\n\nContext: ${JSON.stringify(context)}`
    : prompt

  try {
    const response = await callLazyMind(systemPrompt, userMessage, 800)
    if (workspaceId) void recordAiUsage(userId, workspaceId)
    return NextResponse.json({
      data: { content: response.content, provider: response.provider, type },
      error: null,
    })
  } catch {
    return NextResponse.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
