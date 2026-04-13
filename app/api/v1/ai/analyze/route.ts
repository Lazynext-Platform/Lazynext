import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { callLazyMind } from '@/lib/ai/lazymind'
import { SUMMARIZE_DECISION_PROMPT, SUGGEST_NEXT_ACTIONS_PROMPT } from '@/lib/ai/prompts'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.ai)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const { action, context } = body

  const prompts: Record<string, string> = {
    summarize: SUMMARIZE_DECISION_PROMPT,
    suggest: SUGGEST_NEXT_ACTIONS_PROMPT,
  }

  const systemPrompt = prompts[action as string]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 })
  }

  try {
    const response = await callLazyMind(systemPrompt, JSON.stringify(context), 500)
    return NextResponse.json({ data: { content: response.content, provider: response.provider }, error: null })
  } catch {
    return NextResponse.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
