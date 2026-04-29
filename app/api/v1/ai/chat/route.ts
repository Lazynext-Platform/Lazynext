import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callLazyMind, hasAIKeys } from '@/lib/ai/lazymind'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { checkAiQuota, recordAiUsage } from '@/lib/data/ai-usage'
import { reportApiError } from '@/lib/utils/api-sentry'

// LazyMind free-text chat endpoint. Backs the in-app `LazyMindPanel`.
// Prior to v1.3.3.5 the panel was a UI-only mock — it ran a 1500ms
// `setTimeout` and returned a hardcoded response while displaying
// "Powered by Llama 3.3 70B via Groq" in the footer. The infrastructure
// (`lib/ai/lazymind.ts`) was already wired with Groq + Together fallback;
// it just had no chat-specific endpoint to call.

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  workspaceId: z.string().uuid().optional(),
})

const SYSTEM_PROMPT = `You are LazyMind, the AI assistant inside Lazynext — a graph-native workflow platform that unifies tasks, docs, decisions, threads, and outcomes on an infinite canvas. Lazynext's hero feature is Decision DNA, which scores decision quality on four dimensions (clarity, data quality, risk awareness, alternatives considered) and tracks outcomes over time so teams learn from their choices.

Answer questions about workflow patterns, decision-making, prioritization, and how to use Lazynext effectively. Be concise — most answers should fit in 3-6 sentences. When the user asks for analysis of their workspace, be honest that you don't have direct access to their data unless it was provided in the message; suggest they paste in the specifics.

Never invent statistics, decision counts, or task counts. If you don't know something specific to the user's workspace, say so.`

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  // Plan-gate the daily AI quota when the caller scoped this request
  // to a specific workspace. The panel always passes workspaceId; the
  // legacy callers that don't are exempt (they get the per-minute
  // burst cap above and nothing else, same as before).
  if (parsed.data.workspaceId) {
    const ok = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
    if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    const quota = await checkAiQuota(userId, parsed.data.workspaceId)
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

  if (!hasAIKeys) {
    return NextResponse.json(
      { error: 'AI_NOT_CONFIGURED', message: 'LazyMind is not configured on this deployment. Set GROQ_API_KEY or TOGETHER_API_KEY in .env.local to enable.' },
      { status: 503 },
    )
  }

  try {
    const response = await callLazyMind(SYSTEM_PROMPT, parsed.data.message, 600)
    if (parsed.data.workspaceId) {
      // Best-effort, never blocks the response.
      void recordAiUsage(userId, parsed.data.workspaceId)
    }
    return NextResponse.json({ data: { content: response.content, provider: response.provider }, error: null })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/ai/chat',
      method: 'POST',
      userId,
      workspaceId: parsed.data.workspaceId ?? null,
    })
    const message = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: 'AI_ERROR', message }, { status: 502 })
  }
}
