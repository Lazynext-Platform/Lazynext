import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { linearAdapter } from '@/lib/oauth/linear'

describe('linearAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_ID', 'lin-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_SECRET', 'lin-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL with read scope', () => {
    const url = linearAdapter.buildAuthorizeUrl({
      state: 'csrf',
      redirectUri: 'https://example.com/cb',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://linear.app/oauth/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('lin-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/cb')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('scope')).toBe('read')
    expect(parsed.searchParams.get('state')).toBe('csrf')
    expect(parsed.searchParams.get('prompt')).toBe('consent')
  })

  it('joins scopes with commas in write/admin modes', () => {
    const writeUrl = new URL(
      linearAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'write' }),
    )
    expect(writeUrl.searchParams.get('scope')).toBe('read,write')
    const adminUrl = new URL(
      linearAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'admin' }),
    )
    expect(adminUrl.searchParams.get('scope')).toBe('read,write,admin')
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_ID', '')
    expect(() =>
      linearAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'read' }),
    ).toThrow(/LAZYNEXT_OAUTH_LINEAR_CLIENT_ID/)
  })

  it('declares pkce: false and id/displayName', () => {
    expect(linearAdapter.pkce).toBe(false)
    expect(linearAdapter.id).toBe('linear')
    expect(linearAdapter.displayName).toBe('Linear')
  })
})

describe('linearAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_ID', 'lin-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_LINEAR_CLIENT_SECRET', 'lin-secret-456')
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

  it('exchanges code, runs the viewer query, and returns the envelope', async () => {
    mockFetch([
      async (input, init) => {
        expect(String(input)).toBe('https://api.linear.app/oauth/token')
        const body = (init?.body as string) ?? ''
        expect(body).toContain('client_id=lin-id-123')
        expect(body).toContain('client_secret=lin-secret-456')
        expect(body).toContain('code=auth-code-789')
        expect(body).toContain('grant_type=authorization_code')
        return new Response(
          JSON.stringify({
            access_token: 'lin_access',
            refresh_token: 'lin_refresh',
            expires_in: 3600,
            scope: 'read,write',
            token_type: 'Bearer',
          }),
          { status: 200 },
        )
      },
      async (input, init) => {
        expect(String(input)).toBe('https://api.linear.app/graphql')
        const headers = new Headers(init?.headers as HeadersInit)
        expect(headers.get('authorization')).toBe('Bearer lin_access')
        const body = JSON.parse(String(init?.body)) as { query?: string }
        expect(body.query).toContain('viewer')
        return new Response(
          JSON.stringify({ data: { viewer: { id: 'u-1', name: 'Ava', email: 'ava@example.com' } } }),
          { status: 200 },
        )
      },
    ])

    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const result = await linearAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.accessToken).toBe('lin_access')
    expect(result.refreshToken).toBe('lin_refresh')
    expect(result.expiresAt).toBe(new Date(now + 3600 * 1000).toISOString())
    expect(result.externalId).toBe('u-1')
    expect(result.displayName).toBe('Ava')
    expect(result.scopes).toBe('read,write')
  })

  it('falls back to email when name is null', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      async () =>
        new Response(
          JSON.stringify({ data: { viewer: { id: 'u', name: null, email: 'x@y.z' } } }),
          { status: 200 },
        ),
    ])
    const result = await linearAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('x@y.z')
  })

  it('throws on non-2xx token-exchange response', async () => {
    mockFetch([async () => new Response('bad', { status: 400 })])
    await expect(
      linearAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 400/)
  })

  it('throws when token-exchange 200 contains an error body', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 200 }),
    ])
    await expect(
      linearAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/invalid_grant/)
  })

  it('throws on viewer-endpoint non-2xx', async () => {
    mockFetch([
      async () => new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      async () => new Response('forbidden', { status: 403 }),
    ])
    await expect(
      linearAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 403/)
  })

  it('throws when GraphQL returns errors', async () => {
    mockFetch([
      async () => new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      async () =>
        new Response(JSON.stringify({ errors: [{ message: 'rate_limited' }] }), { status: 200 }),
    ])
    await expect(
      linearAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/rate_limited/)
  })

  it('throws when viewer payload is missing required fields', async () => {
    mockFetch([
      async () => new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      async () => new Response(JSON.stringify({ data: { viewer: {} } }), { status: 200 }),
    ])
    await expect(
      linearAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/unexpected shape/)
  })
})
