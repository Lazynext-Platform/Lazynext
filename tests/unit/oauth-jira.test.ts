import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { jiraAdapter } from '@/lib/oauth/jira'

describe('jiraAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_ID', 'jira-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_SECRET', 'jira-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL with read scope + offline_access + audience', () => {
    const url = jiraAdapter.buildAuthorizeUrl({
      state: 'csrf',
      redirectUri: 'https://example.com/cb',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://auth.atlassian.com/authorize')
    expect(parsed.searchParams.get('audience')).toBe('api.atlassian.com')
    expect(parsed.searchParams.get('client_id')).toBe('jira-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/cb')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('state')).toBe('csrf')
    expect(parsed.searchParams.get('prompt')).toBe('consent')
    const scope = parsed.searchParams.get('scope') ?? ''
    expect(scope).toContain('read:jira-user')
    expect(scope).toContain('read:jira-work')
    expect(scope).toContain('offline_access')
    expect(scope).not.toContain('write:jira-work')
  })

  it('adds write:jira-work in write mode', () => {
    const parsed = new URL(
      jiraAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'write',
      }),
    )
    const scope = parsed.searchParams.get('scope') ?? ''
    expect(scope).toContain('write:jira-work')
    expect(scope).toContain('offline_access')
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_ID', '')
    expect(() =>
      jiraAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'read' }),
    ).toThrow(/LAZYNEXT_OAUTH_JIRA_CLIENT_ID/)
  })

  it('declares pkce: false and id/displayName', () => {
    expect(jiraAdapter.pkce).toBe(false)
    expect(jiraAdapter.id).toBe('jira')
    expect(jiraAdapter.displayName).toBe('Jira')
  })
})

describe('jiraAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_ID', 'jira-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_JIRA_CLIENT_SECRET', 'jira-secret-456')
    realFetch = global.fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.unstubAllEnvs()
  })

  // Match the call by URL because /me and /accessible-resources
  // are kicked off via Promise.all and the order isn't guaranteed.
  function mockFetchByUrl(handlers: Record<string, (init?: RequestInit) => Promise<Response> | Response>) {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const handler = handlers[url]
      if (!handler) throw new Error(`Unexpected fetch URL: ${url}`)
      return handler(init)
    }) as unknown as typeof fetch
  }

  it('exchanges code, runs /me + accessible-resources, and returns the envelope', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async (init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        expect(body.client_id).toBe('jira-id-123')
        expect(body.client_secret).toBe('jira-secret-456')
        expect(body.code).toBe('auth-code-789')
        expect(body.grant_type).toBe('authorization_code')
        return new Response(
          JSON.stringify({
            access_token: 'jira_access',
            refresh_token: 'jira_refresh',
            expires_in: 3600,
            scope: 'read:jira-user read:jira-work offline_access',
            token_type: 'Bearer',
          }),
          { status: 200 },
        )
      },
      'https://api.atlassian.com/me': async (init) => {
        const headers = new Headers(init?.headers as HeadersInit)
        expect(headers.get('authorization')).toBe('Bearer jira_access')
        return new Response(
          JSON.stringify({
            account_id: 'acct-1',
            name: 'Ava',
            email: 'ava@example.com',
          }),
          { status: 200 },
        )
      },
      'https://api.atlassian.com/oauth/token/accessible-resources': async () =>
        new Response(
          JSON.stringify([
            { id: 'cloud-abc', name: 'Acme Eng', url: 'https://acme.atlassian.net' },
            { id: 'cloud-xyz', name: 'Acme Ops', url: 'https://acme-ops.atlassian.net' },
          ]),
          { status: 200 },
        ),
    })

    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    const result = await jiraAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.accessToken).toBe('jira_access')
    expect(result.refreshToken).toBe('jira_refresh')
    expect(result.expiresAt).toBe(new Date(now + 3600 * 1000).toISOString())
    // First cloud id wins; combined with account_id for global uniqueness.
    expect(result.externalId).toBe('cloud-abc:acct-1')
    expect(result.displayName).toBe('Acme Eng (Ava)')
    expect(result.scopes).toBe('read:jira-user read:jira-work offline_access')
  })

  it('falls back to nickname/email/account_id when name is null', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () =>
        new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      'https://api.atlassian.com/me': async () =>
        new Response(
          JSON.stringify({ account_id: 'acct-1', name: null, nickname: 'avs' }),
          { status: 200 },
        ),
      'https://api.atlassian.com/oauth/token/accessible-resources': async () =>
        new Response(
          JSON.stringify([{ id: 'cloud-1', name: 'Site' }]),
          { status: 200 },
        ),
    })
    const result = await jiraAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('Site (avs)')
  })

  it('throws on non-2xx token-exchange response', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () => new Response('bad', { status: 400 }),
    })
    await expect(
      jiraAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 400/)
  })

  it('throws when token-exchange 200 contains an error body', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 200 }),
    })
    await expect(
      jiraAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/invalid_grant/)
  })

  it('throws on /me non-2xx', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () =>
        new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      'https://api.atlassian.com/me': async () => new Response('forbidden', { status: 403 }),
      'https://api.atlassian.com/oauth/token/accessible-resources': async () =>
        new Response(JSON.stringify([{ id: 'c-1', name: 'S' }]), { status: 200 }),
    })
    await expect(
      jiraAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/\/me lookup failed: HTTP 403/)
  })

  it('throws when accessible-resources is empty', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () =>
        new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      'https://api.atlassian.com/me': async () =>
        new Response(JSON.stringify({ account_id: 'acct-1', name: 'N' }), { status: 200 }),
      'https://api.atlassian.com/oauth/token/accessible-resources': async () =>
        new Response(JSON.stringify([]), { status: 200 }),
    })
    await expect(
      jiraAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/no Jira sites/)
  })

  it('throws when /me returns no account_id', async () => {
    mockFetchByUrl({
      'https://auth.atlassian.com/oauth/token': async () =>
        new Response(JSON.stringify({ access_token: 'a' }), { status: 200 }),
      'https://api.atlassian.com/me': async () =>
        new Response(JSON.stringify({ name: 'X' }), { status: 200 }),
      'https://api.atlassian.com/oauth/token/accessible-resources': async () =>
        new Response(JSON.stringify([{ id: 'c-1', name: 'S' }]), { status: 200 }),
    })
    await expect(
      jiraAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/no account_id/)
  })
})
