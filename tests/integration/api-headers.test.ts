import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

/**
 * Integration test for the public-API header contract.
 *
 * Runs the actual `middleware()` function against fabricated requests
 * and asserts every `/api/v1/*` response carries the contract headers.
 * Doesn't need a dev server — `updateSession` short-circuits when
 * Supabase env vars are placeholder (which they are in test).
 *
 * Covers feature #40 phase C.2.
 */

function makeRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: new Headers(headers),
  })
}

describe('Public API header contract (middleware)', () => {
  it('stamps X-Request-Id on /api/v1/* responses', async () => {
    const res = await middleware(makeRequest('/api/v1/whoami'))
    const id = res.headers.get('X-Request-Id')
    expect(id).toBeTruthy()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^req-/)
  })

  it('stamps X-API-Version: v1 on /api/v1/* responses', async () => {
    const res = await middleware(makeRequest('/api/v1/whoami'))
    expect(res.headers.get('X-API-Version')).toBe('v1')
  })

  it('preserves a client-supplied X-Request-Id', async () => {
    const res = await middleware(
      makeRequest('/api/v1/whoami', { 'X-Request-Id': 'client-supplied-abc-123' })
    )
    expect(res.headers.get('X-Request-Id')).toBe('client-supplied-abc-123')
  })

  it('does NOT stamp contract headers on marketing/app routes', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.headers.get('X-Request-Id')).toBeNull()
    expect(res.headers.get('X-API-Version')).toBeNull()
  })

  it('stamps headers on sub-resources of /api/v1/*', async () => {
    for (const path of [
      '/api/v1/nodes',
      '/api/v1/decisions',
      '/api/v1/edges',
      '/api/v1/automations/abc-123',
      '/api/v1/threads/node-id',
      '/api/v1/oauth/google/start',
      '/api/v1/billing/checkout',
      '/api/v1/webhooks/gumroad/some-secret',
    ]) {
      const res = await middleware(makeRequest(path))
      expect(res.headers.get('X-Request-Id'), `path=${path}`).toBeTruthy()
      expect(res.headers.get('X-API-Version'), `path=${path}`).toBe('v1')
    }
  })

  it('emits unique request ids across consecutive requests', async () => {
    const a = await middleware(makeRequest('/api/v1/whoami'))
    const b = await middleware(makeRequest('/api/v1/whoami'))
    expect(a.headers.get('X-Request-Id')).not.toBe(b.headers.get('X-Request-Id'))
  })

  it('does not set NEXT_LOCALE cookie on API requests', async () => {
    const res = await middleware(makeRequest('/api/v1/whoami'))
    // Marketing routes get the cookie; API routes should not.
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).not.toMatch(/NEXT_LOCALE=/)
  })
})
