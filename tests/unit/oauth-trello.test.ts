import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { trelloAdapter } from '@/lib/oauth/trello'

describe('trelloAdapter.buildAuthorizeUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_TRELLO_API_KEY', 'trello-key-abc')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('builds the correct fragment-flow authorize URL with read scope', () => {
    const url = trelloAdapter.buildAuthorizeUrl({
      state: 'csrf',
      redirectUri: 'https://example.com/oauth/trello/bridge',
      mode: 'read',
    })
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://trello.com/1/authorize')
    expect(parsed.searchParams.get('key')).toBe('trello-key-abc')
    expect(parsed.searchParams.get('name')).toBe('Lazynext')
    expect(parsed.searchParams.get('scope')).toBe('read')
    expect(parsed.searchParams.get('expiration')).toBe('never')
    expect(parsed.searchParams.get('response_type')).toBe('token')
    expect(parsed.searchParams.get('callback_method')).toBe('fragment')
    expect(parsed.searchParams.get('return_url')).toBe(
      'https://example.com/oauth/trello/bridge',
    )
    expect(parsed.searchParams.get('state')).toBe('csrf')
  })

  it('joins scopes with commas in write/admin modes', () => {
    const writeUrl = new URL(
      trelloAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'write',
      }),
    )
    expect(writeUrl.searchParams.get('scope')).toBe('read,write')
    const adminUrl = new URL(
      trelloAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'admin',
      }),
    )
    expect(adminUrl.searchParams.get('scope')).toBe('read,write,account')
  })

  it('throws when API_KEY env is missing', () => {
    vi.stubEnv('LAZYNEXT_OAUTH_TRELLO_API_KEY', '')
    expect(() =>
      trelloAdapter.buildAuthorizeUrl({
        state: 's',
        redirectUri: 'https://example.com/cb',
        mode: 'read',
      }),
    ).toThrow(/LAZYNEXT_OAUTH_TRELLO_API_KEY/)
  })

  it("declares flowType: 'fragment', pkce: false, and id/displayName", () => {
    expect(trelloAdapter.flowType).toBe('fragment')
    expect(trelloAdapter.pkce).toBe(false)
    expect(trelloAdapter.id).toBe('trello')
    expect(trelloAdapter.displayName).toBe('Trello')
  })
})

describe('trelloAdapter.exchangeCode (token-as-code)', () => {
  let realFetch: typeof fetch
  beforeEach(() => {
    vi.stubEnv('LAZYNEXT_OAUTH_TRELLO_API_KEY', 'trello-key-abc')
    realFetch = global.fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.unstubAllEnvs()
  })

  function mockFetch(handlers: Array<(input: RequestInfo | URL) => Promise<Response> | Response>) {
    let i = 0
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const handler = handlers[i++]
      if (!handler) throw new Error('Unexpected extra fetch call')
      return handler(input)
    }) as unknown as typeof fetch
  }

  it('treats `code` as the access token and runs /members/me', async () => {
    mockFetch([
      async (input) => {
        const url = new URL(String(input))
        expect(url.origin + url.pathname).toBe('https://api.trello.com/1/members/me')
        expect(url.searchParams.get('key')).toBe('trello-key-abc')
        expect(url.searchParams.get('token')).toBe('TOKEN-FROM-FRAGMENT')
        expect(url.searchParams.get('fields')).toBe('id,fullName,username,email')
        return new Response(
          JSON.stringify({ id: 'mem-1', fullName: 'Ava Patel', username: 'avs', email: 'a@x.io' }),
          { status: 200 },
        )
      },
    ])
    const result = await trelloAdapter.exchangeCode({
      code: 'TOKEN-FROM-FRAGMENT',
      redirectUri: '',
    })
    expect(result.accessToken).toBe('TOKEN-FROM-FRAGMENT')
    expect(result.refreshToken).toBeNull()
    expect(result.expiresAt).toBeNull()
    expect(result.externalId).toBe('mem-1')
    expect(result.displayName).toBe('Ava Patel')
    expect(result.scopes).toBeNull()
  })

  it('falls back to username then email then id when fullName is null', async () => {
    mockFetch([
      async () =>
        new Response(
          JSON.stringify({ id: 'mem-2', fullName: null, username: 'avs', email: null }),
          { status: 200 },
        ),
    ])
    let r = await trelloAdapter.exchangeCode({ code: 't', redirectUri: '' })
    expect(r.displayName).toBe('avs')

    mockFetch([
      async () =>
        new Response(JSON.stringify({ id: 'mem-3', fullName: null, username: null, email: 'e@x.io' }), {
          status: 200,
        }),
    ])
    r = await trelloAdapter.exchangeCode({ code: 't', redirectUri: '' })
    expect(r.displayName).toBe('e@x.io')

    mockFetch([
      async () => new Response(JSON.stringify({ id: 'mem-4' }), { status: 200 }),
    ])
    r = await trelloAdapter.exchangeCode({ code: 't', redirectUri: '' })
    expect(r.displayName).toBe('mem-4')
  })

  it('throws on /members/me non-2xx', async () => {
    mockFetch([async () => new Response('forbidden', { status: 401 })])
    await expect(
      trelloAdapter.exchangeCode({ code: 'invalid-token', redirectUri: '' }),
    ).rejects.toThrow(/HTTP 401/)
  })

  it('throws when /members/me returns no id', async () => {
    mockFetch([async () => new Response(JSON.stringify({ fullName: 'no id' }), { status: 200 })])
    await expect(
      trelloAdapter.exchangeCode({ code: 't', redirectUri: '' }),
    ).rejects.toThrow(/unexpected shape/)
  })
})
