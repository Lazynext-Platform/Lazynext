import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkApiRateLimit,
  API_PLAN_RATE_LIMITS,
  __resetRateLimitStoreForTests,
} from '@/lib/utils/rate-limit'

describe('checkApiRateLimit (two-tier)', () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests()
  })

  it('allows a request when both buckets have headroom', () => {
    const r = checkApiRateLimit({ keyId: 'k1', workspaceId: 'w1', plan: 'pro' })
    expect(r.allowed).toBe(true)
    expect(r.bindingBucket).toBe('none')
    expect(r.retryAfterSec).toBe(0)
    expect(r.headers.limit).toBe(API_PLAN_RATE_LIMITS.pro.perKey.limit)
    expect(r.headers.remaining).toBe(API_PLAN_RATE_LIMITS.pro.perKey.limit - 1)
  })

  it('rejects when the per-key bucket is exhausted', () => {
    const cfg = API_PLAN_RATE_LIMITS.free // perKey: 60, workspace: 120
    // Burn through the per-key bucket.
    for (let i = 0; i < cfg.perKey.limit; i++) {
      checkApiRateLimit({ keyId: 'k-burn', workspaceId: 'w-burn', plan: 'free' })
    }
    const r = checkApiRateLimit({ keyId: 'k-burn', workspaceId: 'w-burn', plan: 'free' })
    expect(r.allowed).toBe(false)
    expect(r.bindingBucket).toBe('per-key')
    expect(r.retryAfterSec).toBeGreaterThan(0)
    expect(r.headers.remaining).toBe(0)
  })

  it('rejects when the workspace ceiling is exhausted across multiple keys', () => {
    const cfg = API_PLAN_RATE_LIMITS.pro // perKey: 600, workspace: 1800
    // Three keys, each 600 reqs → exactly hits the workspace ceiling.
    for (const k of ['k1', 'k2', 'k3']) {
      for (let i = 0; i < cfg.perKey.limit; i++) {
        checkApiRateLimit({ keyId: k, workspaceId: 'w-ceil', plan: 'pro' })
      }
    }
    // Fourth key is still under per-key cap, but workspace is gone.
    const r = checkApiRateLimit({ keyId: 'k4', workspaceId: 'w-ceil', plan: 'pro' })
    expect(r.allowed).toBe(false)
    expect(r.bindingBucket).toBe('workspace')
  })

  it('per-key buckets are isolated across keys in the same workspace', () => {
    const cfg = API_PLAN_RATE_LIMITS.free
    for (let i = 0; i < cfg.perKey.limit; i++) {
      checkApiRateLimit({ keyId: 'k-iso-1', workspaceId: 'w-iso', plan: 'free' })
    }
    // First key exhausted; second key in same workspace should still pass
    // (free workspace ceiling is 120 = 2 × per-key, so 60 + 1 < 120).
    const r = checkApiRateLimit({ keyId: 'k-iso-2', workspaceId: 'w-iso', plan: 'free' })
    expect(r.allowed).toBe(true)
    expect(r.bindingBucket).toBe('none')
  })

  it('workspace buckets are isolated across workspaces', () => {
    const cfg = API_PLAN_RATE_LIMITS.free
    // Burn workspace A's ceiling using one key.
    for (let i = 0; i < cfg.workspace.limit; i++) {
      checkApiRateLimit({
        keyId: `k-ws-${i % 2}`,
        workspaceId: 'ws-A',
        plan: 'free',
      })
    }
    // Workspace B should be untouched.
    const r = checkApiRateLimit({ keyId: 'k-ws-other', workspaceId: 'ws-B', plan: 'free' })
    expect(r.allowed).toBe(true)
  })

  it('returns the binding (stricter) bucket headers when allowed', () => {
    // Pro plan: perKey 600, workspace 1800 — per-key is always stricter.
    const r = checkApiRateLimit({ keyId: 'k-h', workspaceId: 'w-h', plan: 'pro' })
    expect(r.allowed).toBe(true)
    expect(r.headers.limit).toBe(API_PLAN_RATE_LIMITS.pro.perKey.limit)
  })

  it('returns positive retryAfter on rejection (≥ 1 second)', () => {
    const cfg = API_PLAN_RATE_LIMITS.free
    for (let i = 0; i < cfg.perKey.limit; i++) {
      checkApiRateLimit({ keyId: 'k-r', workspaceId: 'w-r', plan: 'free' })
    }
    const r = checkApiRateLimit({ keyId: 'k-r', workspaceId: 'w-r', plan: 'free' })
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(1)
  })

  it('different plans get different limits', () => {
    const free = checkApiRateLimit({ keyId: 'k-p1', workspaceId: 'w-p1', plan: 'free' })
    const business = checkApiRateLimit({
      keyId: 'k-p2',
      workspaceId: 'w-p2',
      plan: 'business',
    })
    expect(free.headers.limit).toBeLessThan(business.headers.limit)
  })
})
