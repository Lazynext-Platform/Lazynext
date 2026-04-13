// Simple in-memory rate limiter for API routes
// For production, use Redis-based rate limiting (e.g., @upstash/ratelimit)

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60_000)
if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref()

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSec: number
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { limit: 100, windowSec: 60 },
  ai: { limit: 20, windowSec: 60 },
  auth: { limit: 10, windowSec: 60 },
  webhook: { limit: 50, windowSec: 60 },
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowSec * 1000
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: config.limit - 1, resetAt }
  }

  if (existing.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { success: true, remaining: config.limit - existing.count, resetAt: existing.resetAt }
}

export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({ error: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  )
}
