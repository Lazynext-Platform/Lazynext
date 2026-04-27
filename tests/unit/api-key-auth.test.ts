import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    // `.update().eq()` chain is awaited as a promise via `.then(...)`
    // in the SUT. The mock `eq` already returns `this`; we add a
    // `then` that resolves immediately so the fire-and-forget update
    // doesn't hang the test.
    then(onFulfilled: (v: { data: unknown; error: unknown }) => unknown) {
      return Promise.resolve({ data: null, error: null }).then(onFulfilled)
    },
  }
  const db = { from: vi.fn(() => queryBuilder) }
  return {
    db,
    hasValidDatabaseUrl: true,
    looksLikePlaceholder: () => false,
    getDb: () => db,
    __qb: queryBuilder,
  }
})

import { authenticateApiKey } from '@/lib/utils/api-key-auth'
import { mintApiKey } from '@/lib/data/api-keys'
import * as dbModule from '@/lib/db/client'

type QB = {
  maybeSingle: ReturnType<typeof vi.fn>
}
const qb = (dbModule as unknown as { __qb: QB }).__qb

beforeEach(() => {
  qb.maybeSingle.mockReset()
})

function reqWith(headers: Record<string, string>) {
  return new Request('http://example.test/v1/something', { headers })
}

describe('authenticateApiKey', () => {
  it('returns null when no auth headers are present', async () => {
    const out = await authenticateApiKey(reqWith({}))
    expect(out).toBeNull()
    expect(qb.maybeSingle).not.toHaveBeenCalled()
  })

  it('returns null on Basic auth (only Bearer is accepted)', async () => {
    const out = await authenticateApiKey(reqWith({ authorization: 'Basic abc:def' }))
    expect(out).toBeNull()
    expect(qb.maybeSingle).not.toHaveBeenCalled()
  })

  it('returns null when bearer token does not start with lzx_', async () => {
    const out = await authenticateApiKey(reqWith({ authorization: 'Bearer not-our-token' }))
    expect(out).toBeNull()
    expect(qb.maybeSingle).not.toHaveBeenCalled()
  })

  it('returns null when the key hash does not match any row', async () => {
    qb.maybeSingle.mockResolvedValue({ data: null, error: null })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `Bearer ${plaintext}` }))
    expect(out).toBeNull()
  })

  it('resolves a matching key via Authorization: Bearer header', async () => {
    qb.maybeSingle.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        expires_at: null,
        scopes: ['read'],
      },
      error: null,
    })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `Bearer ${plaintext}` }))
    expect(out).toEqual({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read'] })
  })

  it('resolves a matching key via X-Api-Key header', async () => {
    qb.maybeSingle.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        expires_at: null,
        scopes: ['read', 'write'],
      },
      error: null,
    })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ 'x-api-key': plaintext }))
    expect(out).toEqual({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read', 'write'] })
  })

  it('rejects an expired key', async () => {
    qb.maybeSingle.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
      error: null,
    })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `Bearer ${plaintext}` }))
    expect(out).toBeNull()
  })

  it('accepts a not-yet-expired key', async () => {
    qb.maybeSingle.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        scopes: ['read'],
      },
      error: null,
    })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `Bearer ${plaintext}` }))
    expect(out).toEqual({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read'] })
  })

  it('returns null on db error (fails closed, never leaks why)', async () => {
    qb.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `Bearer ${plaintext}` }))
    expect(out).toBeNull()
  })

  it('treats lowercase `bearer` the same as `Bearer`', async () => {
    qb.maybeSingle.mockResolvedValue({
      data: { id: 'k1', workspace_id: 'w1', user_id: 'u1', expires_at: null },
      error: null,
    })
    const { plaintext } = mintApiKey()
    const out = await authenticateApiKey(reqWith({ authorization: `bearer ${plaintext}` }))
    expect(out?.workspaceId).toBe('w1')
  })
})
