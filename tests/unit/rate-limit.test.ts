import { describe, it, expect } from 'vitest'
import { rateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/utils/rate-limit'

describe('Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const result = rateLimit('test-rate-1', { limit: 5, windowSec: 60 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('should block requests exceeding limit', () => {
    const config = { limit: 3, windowSec: 60 }
    const id = `test-rate-block-${Date.now()}`
    rateLimit(id, config) // 1
    rateLimit(id, config) // 2
    rateLimit(id, config) // 3
    const result = rateLimit(id, config) // 4 — should be blocked
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should track remaining count correctly', () => {
    const config = { limit: 5, windowSec: 60 }
    const id = `test-rate-count-${Date.now()}`
    expect(rateLimit(id, config).remaining).toBe(4)
    expect(rateLimit(id, config).remaining).toBe(3)
    expect(rateLimit(id, config).remaining).toBe(2)
  })

  it('should have predefined rate limit configs', () => {
    expect(RATE_LIMITS.api).toEqual({ limit: 100, windowSec: 60 })
    expect(RATE_LIMITS.ai).toEqual({ limit: 20, windowSec: 60 })
    expect(RATE_LIMITS.auth).toEqual({ limit: 10, windowSec: 60 })
    expect(RATE_LIMITS.webhook).toEqual({ limit: 50, windowSec: 60 })
  })
})

describe('rateLimitResponse', () => {
  it('emits Retry-After + X-RateLimit-Reset on legacy number signature', () => {
    const resetAt = Date.now() + 30_000
    const r = rateLimitResponse(resetAt)
    expect(r.status).toBe(429)
    expect(r.headers.get('Retry-After')).toBeTruthy()
    expect(r.headers.get('X-RateLimit-Reset')).toBe(String(Math.ceil(resetAt / 1000)))
    // Legacy callers don't supply limit info — those headers should be absent.
    expect(r.headers.get('X-RateLimit-Limit')).toBeNull()
    expect(r.headers.get('X-RateLimit-Remaining')).toBeNull()
  })

  it('emits the full X-RateLimit triplet when limit is provided', () => {
    const resetAt = Date.now() + 30_000
    const r = rateLimitResponse({ resetAt, limit: 100 })
    expect(r.headers.get('X-RateLimit-Limit')).toBe('100')
    // limit known but remaining omitted → infer 0 (we're in the 429 path).
    expect(r.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('respects an explicit remaining count', () => {
    const resetAt = Date.now() + 30_000
    const r = rateLimitResponse({ resetAt, limit: 100, remaining: 3 })
    expect(r.headers.get('X-RateLimit-Remaining')).toBe('3')
  })

  it('clamps Retry-After to ≥ 1 second', () => {
    const r = rateLimitResponse(Date.now() - 5000) // already expired
    expect(Number(r.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
  })
})
