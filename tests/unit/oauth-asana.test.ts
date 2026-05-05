import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { asanaAdapter } from '@/lib/oauth/asana'

describe('asanaAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_ID', 'asana-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_SECRET', 'asana-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL with read scope', () => {
    const url = asanaAdapter.buildAuthorizeUrl({
      state: 'csrf',
      redirectUri: 'https://example.com/cb',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://app.asana.com/-/oauth_authorize')
    expect(parsed.searchParams.get('client_id')).toBe('asana-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/cb')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('scope')).toBe('default')
    expect(parsed.searchParams.get('state')).toBe('csrf')
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_ID', '')
    expect(() =>
      asanaAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'read' }),
    ).toThrow(/LAZYNEXT_OAUTH_ASANA_CLIENT_ID/)
  })

  it('declares pkce: false and id/displayName', () => {
    expect(asanaAdapter.pkce).toBe(false)
    expect(asanaAdapter.id).toBe('asana')
    expect(asanaAdapter.displayName).toBe('Asana')
  })
})

describe('asanaAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_ID', 'asana-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_ASANA_CLIENT_SECRET', 'asana-secret-456')
    realFetch = global.fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.unstubAllEnvs()
  })

  function mockFetch(
    handlers: Array<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response>,
  ) {
    let i = 0
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const handler = handlers[i++]
      if (!handler) throw new Error('Unexpected extra fetch call')
      return handler(input, init)
    }) as unknown as typeof fetch
  }

  it('exchanges code and returns the envelope including refresh + expiry', async () => {
    mockFetch([
      async (input, init) => {
        expect(String(input)).toBe('https://app.asana.com/-/oauth_token')
        const body = (init?.body as string) ?? ''
        expect(body).toContain('client_id=asana-id-123')
        expect(body).toContain('client_secret=asana-secret-456')
        expect(body).toContain('code=auth-code-789')
        expect(body).toContain('grant_type=authorization_code')
        return new Response(
          JSON.stringify({
            access_token: 'asana_access',
            refresh_token: 'asana_refresh',
            expires_in: 3600,
            token_type: 'bearer',
            data: { gid: 'u-42', name: 'Ava', email: 'ava@example.com' },
          }),
          { status: 200 },
        )
      },
    ])

    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const result = await asanaAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.accessToken).toBe('asana_access')
    expect(result.refreshToken).toBe('asana_refresh')
    expect(result.expiresAt).toBe(new Date(now + 3600 * 1000).toISOString())
    expect(result.externalId).toBe('u-42')
    expect(result.displayName).toBe('Ava')
    expect(result.scopes).toBeNull()
  })

  it('falls back to legacy `id` field when `gid` is missing', async () => {
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'a',
            data: { id: 99, name: 'Legacy' },
          }),
          { status: 200 },
        ),
    ])
    const result = await asanaAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.externalId).toBe('99')
    expect(result.displayName).toBe('Legacy')
  })

  it('falls back to email then id when name is null', async () => {
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'a',
            data: { gid: 'g-1', name: null, email: 'fallback@x.io' },
          }),
          { status: 200 },
        ),
    ])
    const result = await asanaAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('fallback@x.io')
  })

  it('throws on non-2xx token-exchange response', async () => {
    mockFetch([async () => new Response('bad', { status: 400 })])
    await expect(
      asanaAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 400/)
  })

  it('throws when token-exchange 200 contains an error body', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 200 }),
    ])
    await expect(
      asanaAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/invalid_grant/)
  })

  it('throws when token-exchange response is missing user id', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ access_token: 'a', data: { name: 'no id' } }), {
          status: 200,
        }),
    ])
    await expect(
      asanaAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/missing data\.id\/data\.gid/)
  })

  it('returns expiresAt: null when the response has no expires_in', async () => {
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'a',
            data: { gid: 'g-1', name: 'X' },
          }),
          { status: 200 },
        ),
    ])
    const result = await asanaAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.expiresAt).toBeNull()
  })
})
