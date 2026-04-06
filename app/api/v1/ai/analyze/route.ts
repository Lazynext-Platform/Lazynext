import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { callLazyMind } from '@/lib/ai/lazymind'
import { SUMMARIZE_DECISION_PROMPT, SUGGEST_NEXT_ACTIONS_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { action, context } = await req.json()

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
    return NextResponse.json({ data: { content: response.content, provider: response.provider }, error: null })
  } catch (error) {
    return NextResponse.json({ error: 'AI_UNAVAILABLE' }, { status: 503 })
  }
}
