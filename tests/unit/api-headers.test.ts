import { describe, it, expect } from 'vitest'
import {
  buildResponseHeaders,
  headersToObject,
  newRequestId,
} from '@/lib/utils/api-headers'

describe('newRequestId', () => {
  it('returns a non-empty string', () => {
    const id = newRequestId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns a different value on each call', () => {
    const a = newRequestId()
    const b = newRequestId()
    expect(a).not.toBe(b)
  })

  it('is uuid-shaped (36 chars with 4 dashes)', () => {
    const id = newRequestId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})

describe('buildResponseHeaders', () => {
  it('always emits X-Request-Id and defaults X-API-Version to v1', () => {
    const h = buildResponseHeaders({ requestId: 'req-1' })
    expect(h.get('X-Request-Id')).toBe('req-1')
    expect(h.get('X-API-Version')).toBe('v1')
  })

  it('respects an explicit apiVersion', () => {
    const h = buildResponseHeaders({ requestId: 'r', apiVersion: 'v2' })
    expect(h.get('X-API-Version')).toBe('v2')
  })

  it('emits the rate-limit triplet when rateLimit info is present', () => {
    const h = buildResponseHeaders({
      requestId: 'r',
      rateLimit: { limit: 100, remaining: 42, resetAtSec: 1745842800 },
    })
    expect(h.get('X-RateLimit-Limit')).toBe('100')
    expect(h.get('X-RateLimit-Remaining')).toBe('42')
    expect(h.get('X-RateLimit-Reset')).toBe('1745842800')
  })

  it('clamps a negative remaining count to 0', () => {
    const h = buildResponseHeaders({
      requestId: 'r',
      rateLimit: { limit: 100, remaining: -5, resetAtSec: 1745842800 },
    })
    expect(h.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('omits rate-limit headers entirely when not provided', () => {
    const h = buildResponseHeaders({ requestId: 'r' })
    expect(h.get('X-RateLimit-Limit')).toBeNull()
    expect(h.get('X-RateLimit-Remaining')).toBeNull()
    expect(h.get('X-RateLimit-Reset')).toBeNull()
  })

  it('emits Retry-After only when retryAfterSec is positive', () => {
    const h0 = buildResponseHeaders({ requestId: 'r' })
    expect(h0.get('Retry-After')).toBeNull()
    const h1 = buildResponseHeaders({ requestId: 'r', retryAfterSec: 30 })
    expect(h1.get('Retry-After')).toBe('30')
    const h2 = buildResponseHeaders({ requestId: 'r', retryAfterSec: 0 })
    expect(h2.get('Retry-After')).toBeNull()
  })

  it('rounds Retry-After up to whole seconds', () => {
    const h = buildResponseHeaders({ requestId: 'r', retryAfterSec: 1.2 })
    expect(h.get('Retry-After')).toBe('2')
  })

  it('emits Sunset + Deprecation + Link when deprecation is set', () => {
    const sunset = new Date('2026-10-01T00:00:00Z')
    const dep = new Date('2026-04-01T00:00:00Z')
    const h = buildResponseHeaders({
      requestId: 'r',
      deprecation: {
        sunsetDate: sunset,
        deprecationDate: dep,
        link: 'https://lazynext.com/docs/api/changelog#v2',
      },
    })
    expect(h.get('Sunset')).toBe(sunset.toUTCString())
    // draft-ietf-httpapi-deprecation-header: `@<unix-seconds>`
    expect(h.get('Deprecation')).toBe(`@${Math.floor(dep.getTime() / 1000)}`)
    expect(h.get('Link')).toBe('<https://lazynext.com/docs/api/changelog#v2>; rel="deprecation"')
  })

  it('omits deprecation headers when not set', () => {
    const h = buildResponseHeaders({ requestId: 'r' })
    expect(h.get('Sunset')).toBeNull()
    expect(h.get('Deprecation')).toBeNull()
    expect(h.get('Link')).toBeNull()
  })
})

describe('headersToObject', () => {
  it('converts a Headers instance to a plain record (case-insensitive lookup)', () => {
    const h = buildResponseHeaders({
      requestId: 'r',
      rateLimit: { limit: 100, remaining: 50, resetAtSec: 1745842800 },
    })
    const obj = headersToObject(h)
    // Headers normalises casing implementation-dependent — match either form.
    const find = (k: string) => {
      const target = k.toLowerCase()
      const hit = Object.keys(obj).find((key) => key.toLowerCase() === target)
      return hit ? obj[hit] : undefined
    }
    expect(find('X-Request-Id')).toBe('r')
    expect(find('X-API-Version')).toBe('v1')
    expect(find('X-RateLimit-Limit')).toBe('100')
  })
})
