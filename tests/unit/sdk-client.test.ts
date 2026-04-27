import { describe, it, expect, vi } from 'vitest'
import { LazynextClient, LazynextApiError } from '@/lib/sdk/client'

function mockFetch(responses: Array<Partial<Response> & { jsonBody?: unknown }>) {
  let i = 0
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    const r = responses[i++]
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.jsonBody,
    } as unknown as Response
  })
  return fn
}

describe('LazynextClient', () => {
  const opts = {
    apiKey: 'lzx_test',
    workspaceId: 'ws-1',
    baseUrl: 'https://example.test/api/v1',
  }

  it('throws when apiKey is missing', () => {
    expect(() => new LazynextClient({ ...opts, apiKey: '' })).toThrow(/apiKey/)
  })

  it('throws when workspaceId is missing', () => {
    expect(() => new LazynextClient({ ...opts, workspaceId: '' })).toThrow(/workspaceId/)
  })

  it('decisions.list sends bearer header and parses response', async () => {
    const fetchMock = mockFetch([
      { ok: true, jsonBody: { decisions: [{ id: 'd1', title: 'Pick stack' }] } },
    ])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    const got = await lzx.decisions.list()
    expect(got).toHaveLength(1)
    expect(got[0].id).toBe('d1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v1/decisions?workspaceId=ws-1')
    expect((init as RequestInit).method).toBe('GET')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer lzx_test' })
  })

  it('decisions.create POSTs JSON body', async () => {
    const fetchMock = mockFetch([{ ok: true, jsonBody: { id: 'd2', title: 'New' } }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    const got = await lzx.decisions.create({ title: 'New' })
    expect(got.id).toBe('d2')
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBe('{"title":"New"}')
    expect((init as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('maps 403 INSUFFICIENT_SCOPE to typed error with requiredScope', async () => {
    const fetchMock = mockFetch([
      {
        ok: false,
        status: 403,
        jsonBody: { error: 'INSUFFICIENT_SCOPE', message: 'write required', requiredScope: 'write' },
      },
    ])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    await expect(lzx.decisions.create({ title: 'x' })).rejects.toMatchObject({
      name: 'LazynextApiError',
      code: 'INSUFFICIENT_SCOPE',
      status: 403,
      requiredScope: 'write',
    })
  })

  it('maps 401 to UNAUTHORIZED', async () => {
    const fetchMock = mockFetch([{ ok: false, status: 401, jsonBody: { error: 'UNAUTHORIZED' } }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    try {
      await lzx.decisions.list()
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(LazynextApiError)
      expect((e as LazynextApiError).code).toBe('UNAUTHORIZED')
    }
  })

  it('maps 429 to RATE_LIMITED', async () => {
    const fetchMock = mockFetch([{ ok: false, status: 429, jsonBody: { error: 'RATE_LIMITED' } }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    await expect(lzx.decisions.list()).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 })
  })

  it('maps 404 to NOT_FOUND', async () => {
    const fetchMock = mockFetch([{ ok: false, status: 404, jsonBody: {} }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    await expect(lzx.decisions.get('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('maps 5xx to SERVER_ERROR', async () => {
    const fetchMock = mockFetch([{ ok: false, status: 503, jsonBody: {} }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    await expect(lzx.decisions.list()).rejects.toMatchObject({ code: 'SERVER_ERROR' })
  })

  it('decisions.delete sends DELETE and resolves void', async () => {
    const fetchMock = mockFetch([{ ok: true, status: 204, jsonBody: undefined }])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    await expect(lzx.decisions.delete('d1')).resolves.toBeUndefined()
    const [, init] = fetchMock.mock.calls[0]
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('whoami returns the resolved identity', async () => {
    const fetchMock = mockFetch([
      {
        ok: true,
        jsonBody: {
          authType: 'apiKey',
          userId: 'u-1',
          workspaceId: 'ws-1',
          keyId: 'k-1',
          keyPrefix: 'lzx_abcd1234',
          keyName: 'CI runner',
          scopes: ['read', 'write'],
        },
      },
    ])
    const lzx = new LazynextClient({ ...opts, fetch: fetchMock as unknown as typeof fetch })
    const me = await lzx.whoami()
    expect(me.authType).toBe('apiKey')
    expect(me.workspaceId).toBe('ws-1')
    expect(me.scopes).toEqual(['read', 'write'])
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v1/whoami')
  })
})
