const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions'

// A key literally set to "placeholder" (our stock .env.local value) is worse
// than no key at all — callLazyMind would waste a 10s timeout and then fall
// back to heuristic anyway. Treat it as unset.
function isRealKey(v: string | undefined): boolean {
  if (!v) return false
  const lower = v.toLowerCase().trim()
  if (lower === '' || lower === 'placeholder' || lower === 'your-api-key') return false
  return true
}

const hasAIKeys = isRealKey(process.env.GROQ_API_KEY) || isRealKey(process.env.TOGETHER_API_KEY)
export { hasAIKeys }

interface LLMResponse {
  content: string
  provider: 'groq' | 'together'
}

export async function callLazyMind(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 500
): Promise<LLMResponse> {
  if (!hasAIKeys) {
    throw new Error('AI is not configured. Set GROQ_API_KEY or TOGETHER_API_KEY in .env.local')
  }

  // Primary: Groq (fast)
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      throw new Error(`Groq error: ${res.status}${errBody?.error?.message ? ` — ${errBody.error.message}` : ''}`)
    }
    const data = await res.json()
    return { content: data.choices[0].message.content, provider: 'groq' }
  } catch {
    // Fallback: Together AI
  }

  const res = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new Error(`Together error: ${res.status}${errBody?.error?.message ? ` — ${errBody.error.message}` : ''}`)
  }
  let data: { choices: { message: { content: string } }[] }
  try {
    data = await res.json()
  } catch {
    throw new Error('Together AI returned invalid JSON')
  }
  return { content: data.choices[0].message.content, provider: 'together' }
}
