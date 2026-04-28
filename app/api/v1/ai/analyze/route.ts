import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callLazyMind } from '@/lib/ai/lazymind'
import { SUMMARIZE_DECISION_PROMPT, SUGGEST_NEXT_ACTIONS_PROMPT } from '@/lib/ai/prompts'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { checkAiQuota, recordAiUsage } from '@/lib/data/ai-usage'

const analyzeSchema = z.object({
  action: z.enum(['summarize', 'suggest']),
  context: z.unknown(),
  workspaceId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = analyzeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_ACTION', details: parsed.error.flatten() }, { status: 400 })
  }

  const { action, context } = parsed.data
  const workspaceId = parsed.data.workspaceId

  // Plan-gate the daily AI quota when scoped to a workspace. Same
  // pattern as `/api/v1/ai/chat` and `/api/v1/ai/generate`.
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

  const prompts: Record<string, string> = {
    summarize: SUMMARIZE_DECISION_PROMPT,
    suggest: SUGGEST_NEXT_ACTIONS_PROMPT,
  }

  const systemPrompt = prompts[action]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 })
  }

  try {
    const response = await callLazyMind(systemPrompt, JSON.stringify(context), 500)
    if (workspaceId) void recordAiUsage(userId, workspaceId)
    return NextResponse.json({ data: { content: response.content, provider: response.provider }, error: null })
  } catch {
    return NextResponse.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
