import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { slackAdapter } from '@/lib/oauth/slack'

describe('slackAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_ID', 'slack-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET', 'slack-secret-456')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct authorize URL with read bot scopes', () => {
    const url = slackAdapter.buildAuthorizeUrl({
      state: 'csrf',
      redirectUri: 'https://example.com/cb',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://slack.com/oauth/v2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('slack-id-123')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/cb')
    expect(parsed.searchParams.get('scope')).toBe('channels:read team:read')
    expect(parsed.searchParams.get('user_scope')).toBe('')
    expect(parsed.searchParams.get('state')).toBe('csrf')
  })

  it('uses chat:write + chat:write.public for write mode', () => {
    const url = new URL(
      slackAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'write' }),
    )
    expect(url.searchParams.get('scope')).toBe(
      'channels:read team:read chat:write chat:write.public',
    )
  })

  it('throws when CLIENT_ID env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_ID', '')
    expect(() =>
      slackAdapter.buildAuthorizeUrl({ state: 's', redirectUri: 'https://example.com/cb', mode: 'read' }),
    ).toThrow(/LAZYNEXT_OAUTH_SLACK_CLIENT_ID/)
  })

  it('declares pkce: false and id/displayName', () => {
    expect(slackAdapter.pkce).toBe(false)
    expect(slackAdapter.id).toBe('slack')
    expect(slackAdapter.displayName).toBe('Slack')
  })
})

describe('slackAdapter.exchangeCode', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_ID', 'slack-id-123')
    vi.stubEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET', 'slack-secret-456')
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
      expect(String(input)).toBe('https://slack.com/api/oauth.v2.access')
      const body = (init?.body as string) ?? ''
      expect(body).toContain('client_id=slack-id-123')
      expect(body).toContain('client_secret=slack-secret-456')
      expect(body).toContain('code=auth-code-789')
      return new Response(
        JSON.stringify({
          ok: true,
          access_token: 'xoxb-bot-token',
          token_type: 'bot',
          scope: 'channels:read,chat:write',
          bot_user_id: 'B-123',
          app_id: 'A-1',
          team: { id: 'T-ACME', name: 'Acme Workspace' },
        }),
        { status: 200 },
      )
    })

    const result = await slackAdapter.exchangeCode({
      code: 'auth-code-789',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.accessToken).toBe('xoxb-bot-token')
    expect(result.refreshToken).toBeNull()
    expect(result.expiresAt).toBeNull()
    // External id is the team id, not the user id.
    expect(result.externalId).toBe('T-ACME')
    expect(result.displayName).toBe('Acme Workspace')
    expect(result.scopes).toBe('channels:read,chat:write')
  })

  it('falls back to team.id when team.name is missing', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({ ok: true, access_token: 't', team: { id: 'T-1' } }),
        { status: 200 },
      ),
    )
    const result = await slackAdapter.exchangeCode({
      code: 'c',
      redirectUri: 'https://example.com/cb',
    })
    expect(result.displayName).toBe('T-1')
  })

  it('throws on non-2xx HTTP response', async () => {
    mockFetch(async () => new Response('bad', { status: 500 }))
    await expect(
      slackAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/HTTP 500/)
  })

  it('throws when ok=false in the response body', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ ok: false, error: 'invalid_code' }), { status: 200 }),
    )
    await expect(
      slackAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/invalid_code/)
  })

  it('throws when ok=true but team.id is missing', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ ok: true, access_token: 't' }), { status: 200 }),
    )
    await expect(
      slackAdapter.exchangeCode({ code: 'c', redirectUri: 'https://example.com/cb' }),
    ).rejects.toThrow(/missing team.id/)
  })
})
