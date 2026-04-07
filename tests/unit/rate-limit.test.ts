import { describe, it, expect } from 'vitest'
import { rateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'

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
