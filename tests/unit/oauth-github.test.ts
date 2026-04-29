import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { githubAdapter } from '@/lib/oauth/github'

const ORIGINAL_ENV = { ...process.env }

describe('githubAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_ID', 'gh-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_SECRET', 'gh-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL with read scopes', () => {
    const url = githubAdapter.buildAuthorizeUrl({
      state: 'csrf-state-token',
      redirectUri: 'https://example.com/api/v1/oauth/github/callback',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('gh-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://example.com/api/v1/oauth/github/callback',
    )
    expect(parsed.searchParams.get('state')).toBe('csrf-state-token')
    expect(parsed.searchParams.get('allow_signup')).toBe('false')
    expect(parsed.searchParams.get('scope')).toBe('read:user user:email')
  })

  it('uses the write-mode scope set when mode=write', () => {
    const url = githubAdapter.buildAuthorizeUrl({
      state: 's',
      redirectUri: 'https://example.com/cb',
      mode: 'write',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('scope')).toBe('read:user user:email public_repo')
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_ID', '')
    expect(() =>
      githubAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'read',
      }),
    ).toThrow(/LAZYNEXT_OAUTH_GITHUB_CLIENT_ID/)
  })

  it('declares pkce: false (GitHub OAuth web flow)', () => {
    expect(githubAdapter.pkce).toBe(false)
  })

  it('exposes provider id and display name', () => {
    expect(githubAdapter.id).toBe('github')
    expect(githubAdapter.displayName).toBe('GitHub')
  })
})

describe('githubAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_ID', 'gh-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_GITHUB_CLIENT_SECRET', 'gh-secret-456')
    realFetch = global.fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.unstubAllEnvs()
  })

  function mockFetch(handlers: Array<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response>) {
    let i = 0
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const handler = handlers[i++]
      if (!handler) throw new Error('Unexpected extra fetch call')
      return handler(input, init)
    }) as unknown as typeof fetch
  }

  it('exchanges code, fetches user, and returns the token envelope', async () => {
    mockFetch([
      // Token exchange
      async (input, init) => {
        expect(String(input)).toBe('https://github.com/login/oauth/access_token')
        const body = (init?.body as string) ?? ''
        expect(body).toContain('code=auth-code-789')
        expect(body).toContain('client_id=gh-id-123')
        expect(body).toContain('client_secret=gh-secret-456')
        return new Response(
          JSON.stringify({
            access_token: 'gho_access',
            refresh_token: 'ghr_refresh',
            scope: 'read:user,user:email',
            token_type: 'bearer',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      },
      // User lookup
      async (input, init) => {
        expect(String(input)).toBe('https://api.github.com/user')
        const headers = new Headers(init?.headers as HeadersInit)
        expect(headers.get('authorization')).toBe('Bearer gho_access')
        expect(headers.get('user-agent')).toBe('Lazynext-OAuth/1.0')
        return new Response(
          JSON.stringify({ id: 12345, login: 'octocat', name: 'The Octocat' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      },
    ])

    const result = await githubAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })

    expect(result.accessToken).toBe('gho_access')
    expect(result.refreshToken).toBe('ghr_refresh')
    expect(result.externalId).toBe('12345')
    expect(result.displayName).toBe('The Octocat')
    expect(result.scopes).toBe('read:user,user:email')
    // No expires_in returned ⇒ expiresAt is null.
    expect(result.expiresAt).toBeNull()
  })

  it('falls back to login when name is null', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ access_token: 'gho_x' }), { status: 200 }),
      async () =>
        new Response(JSON.stringify({ id: 1, login: 'octocat', name: null }), {
          status: 200,
        }),
    ])
    const result = await githubAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('octocat')
  })

  it('computes expiresAt when GitHub returns expires_in', async () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({ access_token: 'gho_x', expires_in: 3600 }),
          { status: 200 },
        ),
      async () =>
        new Response(JSON.stringify({ id: 1, login: 'octocat', name: 'x' }), {
          status: 200,
        }),
    ])
    const result = await githubAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.expiresAt).toBe(new Date(now + 3600 * 1000).toISOString())
  })

  it('throws on non-2xx token-exchange response', async () => {
    mockFetch([async () => new Response('bad', { status: 401 })])
    await expect(
      githubAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 401/)
  })

  it('throws when GitHub returns 200 with an error body', async () => {
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({ error: 'bad_verification_code', error_description: 'nope' }),
          { status: 200 },
        ),
    ])
    await expect(
      githubAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/bad_verification_code/)
  })

  it('throws when user lookup fails', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ access_token: 'gho_x' }), { status: 200 }),
      async () => new Response('forbidden', { status: 403 }),
    ])
    await expect(
      githubAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 403/)
  })

  it('throws when user payload is missing required fields', async () => {
    mockFetch([
      async () =>
        new Response(JSON.stringify({ access_token: 'gho_x' }), { status: 200 }),
      async () => new Response(JSON.stringify({ login: 'no-id' }), { status: 200 }),
    ])
    await expect(
      githubAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/unexpected shape/)
  })
})

afterEach(() => {
  // Restore to a known state — vitest stubs are unstubbed in
  // each describe's afterEach already, but this is belt-and-braces.
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k]
  }
})
