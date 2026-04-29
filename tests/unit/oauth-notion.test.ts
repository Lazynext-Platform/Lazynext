import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { notionAdapter } from '@/lib/oauth/notion'

describe('notionAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_ID', 'notion-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_SECRET', 'notion-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL', () => {
    const url = notionAdapter.buildAuthorizeUrl({
      state: 'csrf-token',
      redirectUri: 'https://example.com/api/v1/oauth/notion/callback',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://api.notion.com/v1/oauth/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('notion-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://example.com/api/v1/oauth/notion/callback',
    )
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('owner')).toBe('user')
    expect(parsed.searchParams.get('state')).toBe('csrf-token')
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_ID', '')
    expect(() =>
      notionAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'read',
      }),
    ).toThrow(/LAZYNEXT_OAUTH_NOTION_CLIENT_ID/)
  })

  it('declares pkce: true and id/displayName', () => {
    expect(notionAdapter.pkce).toBe(true)
    expect(notionAdapter.id).toBe('notion')
    expect(notionAdapter.displayName).toBe('Notion')
  })

  it('returns empty scope arrays for all modes', () => {
    expect(notionAdapter.scopes.read).toEqual([])
    expect(notionAdapter.scopes.write).toEqual([])
    expect(notionAdapter.scopes.admin).toEqual([])
  })
})

describe('notionAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_ID', 'notion-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_SECRET', 'notion-secret-456')
    realFetch = global.fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.unstubAllEnvs()
  })

  function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response) {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(input, init)) as unknown as typeof fetch
  }

  it('exchanges code in a single round-trip and returns the envelope', async () => {
    mockFetch(async (input, init) => {
      expect(String(input)).toBe('https://api.notion.com/v1/oauth/token')
      const headers = new Headers(init?.headers as HeadersInit)
      const expectedBasic = Buffer.from('notion-id-123:notion-secret-456').toString('base64')
      expect(headers.get('authorization')).toBe(`Basic ${expectedBasic}`)
      expect(headers.get('content-type')).toBe('application/json')
      const body = JSON.parse(String(init?.body))
      expect(body.grant_type).toBe('authorization_code')
      expect(body.code).toBe('auth-code-789')
      expect(body.redirect_uri).toBe('https://example.com/cb')
      return new Response(
        JSON.stringify({
          access_token: 'secret_notion_token',
          bot_id: 'bot-abc-123',
          workspace_id: 'ws-xyz',
          workspace_name: 'Acme Workspace',
          owner: { type: 'user', user: { id: 'u1', name: 'Ava' } },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

    const result = await notionAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.accessToken).toBe('secret_notion_token')
    expect(result.refreshToken).toBeNull()
    expect(result.expiresAt).toBeNull()
    expect(result.externalId).toBe('bot-abc-123')
    expect(result.displayName).toBe('Acme Workspace')
    expect(result.scopes).toBeNull()
  })

  it('falls back to owner.user.name when workspace_name is missing', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: 't',
          bot_id: 'b',
          owner: { user: { name: 'Ava' } },
        }),
        { status: 200 },
      ),
    )
    const result = await notionAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('Ava')
  })

  it('falls back to bot_id when no name fields are present', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ access_token: 't', bot_id: 'bot-xyz' }), { status: 200 }),
    )
    const result = await notionAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('bot-xyz')
  })

  it('throws on non-2xx token-exchange response', async () => {
    mockFetch(async () => new Response('bad', { status: 401 }))
    await expect(
      notionAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 401/)
  })

  it('throws when bot_id is missing from a 200 response', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ access_token: 't' }), { status: 200 }),
    )
    await expect(
      notionAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/no_access_token_or_bot_id/)
  })

  it('throws when Notion returns 200 with an error body', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 200 }),
    )
    await expect(
      notionAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/invalid_grant/)
  })
})
