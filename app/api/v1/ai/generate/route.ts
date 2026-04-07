import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { callLazyMind } from '@/lib/ai/lazymind'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(['node_content', 'decision_rationale', 'doc_draft', 'task_breakdown']),
  context: z.record(z.string(), z.unknown()).optional(),
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
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { prompt, type, context } = parsed.data
  const systemPrompt = systemPrompts[type]
  const userMessage = context
    ? `${prompt}\n\nContext: ${JSON.stringify(context)}`
    : prompt

  try {
    const response = await callLazyMind(systemPrompt, userMessage, 800)
    return NextResponse.json({
      data: { content: response.content, provider: response.provider, type },
      error: null,
    })
  } catch {
    return NextResponse.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
