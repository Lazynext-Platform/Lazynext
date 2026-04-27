import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    _result: { data: null as unknown, error: null as unknown, count: 0 },
    then(onFulfilled: (v: { data: unknown; error: unknown; count: number }) => unknown) {
      return Promise.resolve(this._result).then(onFulfilled)
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

import {
  mintApiKey,
  hashApiKey,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  normalizeScopes,
  rotateApiKey,
} from '@/lib/data/api-keys'
import * as dbModule from '@/lib/db/client'
type QB = {
  _result: { data: unknown; error: unknown; count: number }
  single: ReturnType<typeof vi.fn>
}
const qb = (dbModule as unknown as { __qb: QB }).__qb

beforeEach(() => {
  qb._result = { data: null, error: null, count: 0 }
  qb.single.mockReset()
})

describe('mintApiKey', () => {
  it('returns a `lzx_` namespaced plaintext, sha-256 hash, and 8-char prefix', () => {
    const { plaintext, keyHash, keyPrefix } = mintApiKey()
    expect(plaintext.startsWith('lzx_')).toBe(true)
    // 32 bytes -> 43 base64url chars + 4-char namespace = 47.
    expect(plaintext.length).toBe(47)
    // sha-256 hex is 64 chars.
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/)
    expect(keyPrefix.length).toBe(8)
    // Prefix is the first 8 chars of the random part (after `lzx_`).
    expect(plaintext.slice(4, 12)).toBe(keyPrefix)
  })

  it('produces unique keys across calls', () => {
    const a = mintApiKey()
    const b = mintApiKey()
    expect(a.plaintext).not.toBe(b.plaintext)
    expect(a.keyHash).not.toBe(b.keyHash)
  })

  it('hashApiKey is deterministic and matches mintApiKey output', () => {
    const { plaintext, keyHash } = mintApiKey()
    expect(hashApiKey(plaintext)).toBe(keyHash)
  })
})

describe('listApiKeys', () => {
  it('maps snake_case to camelCase and never exposes key_hash', async () => {
    qb._result = {
      data: [
        {
          id: 'k1',
          workspace_id: 'w1',
          user_id: 'u1',
          name: 'CI runner',
          key_prefix: 'a1b2c3d4',
          scopes: ['read'],
          last_used_at: null,
          expires_at: null,
          created_at: '2026-04-28T00:00:00Z',
        },
      ],
      error: null,
      count: 0,
    }
    const out = await listApiKeys('w1')
    expect(out).toEqual([
      {
        id: 'k1',
        workspaceId: 'w1',
        userId: 'u1',
        name: 'CI runner',
        keyPrefix: 'a1b2c3d4',
        scopes: ['read'],
        lastUsedAt: null,
        expiresAt: null,
        createdAt: '2026-04-28T00:00:00Z',
      },
    ])
    // The mapped row must not carry the hash under any key.
    const serialized = JSON.stringify(out)
    expect(serialized).not.toMatch(/key_?hash/i)
  })

  it('returns [] on db error', async () => {
    qb._result = { data: null, error: { message: 'boom' }, count: 0 }
    const out = await listApiKeys('w1')
    expect(out).toEqual([])
  })
})

describe('createApiKey', () => {
  it('returns plaintext + mapped row on success', async () => {
    qb.single.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        name: 'CI runner',
        key_prefix: 'abcdefgh',
        last_used_at: null,
        expires_at: null,
        created_at: '2026-04-28T00:00:00Z',
      },
      error: null,
    })
    const result = await createApiKey({ workspaceId: 'w1', userId: 'u1', name: 'CI runner' })
    expect(result).not.toBeNull()
    expect(result!.plaintext.startsWith('lzx_')).toBe(true)
    expect(result!.row.name).toBe('CI runner')
    expect(result!.row.keyPrefix).toBe('abcdefgh')
  })

  it('returns null on db error', async () => {
    qb.single.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const result = await createApiKey({ workspaceId: 'w1', userId: 'u1', name: 'CI runner' })
    expect(result).toBeNull()
  })

  it('trims and truncates name to 100 chars', async () => {
    qb.single.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        name: 'a'.repeat(100),
        key_prefix: 'abcdefgh',
        last_used_at: null,
        expires_at: null,
        created_at: '2026-04-28T00:00:00Z',
      },
      error: null,
    })
    const result = await createApiKey({
      workspaceId: 'w1',
      userId: 'u1',
      name: '  ' + 'a'.repeat(150) + '  ',
    })
    expect(result).not.toBeNull()
    expect(result!.row.name.length).toBe(100)
  })
})

describe('deleteApiKey', () => {
  it('returns true when count > 0', async () => {
    qb._result = { data: null, error: null, count: 1 }
    const ok = await deleteApiKey({ workspaceId: 'w1', keyId: 'k1' })
    expect(ok).toBe(true)
  })

  it('returns false when count is 0 (id from another workspace)', async () => {
    qb._result = { data: null, error: null, count: 0 }
    const ok = await deleteApiKey({ workspaceId: 'w1', keyId: 'k1' })
    expect(ok).toBe(false)
  })

  it('returns false on db error', async () => {
    qb._result = { data: null, error: { message: 'boom' }, count: 0 }
    const ok = await deleteApiKey({ workspaceId: 'w1', keyId: 'k1' })
    expect(ok).toBe(false)
  })
})

describe('normalizeScopes', () => {
  it('defaults empty input to least-privilege [read]', () => {
    expect(normalizeScopes(undefined)).toEqual(['read'])
    expect(normalizeScopes(null)).toEqual(['read'])
    expect(normalizeScopes([])).toEqual(['read'])
  })

  it('whitelists unknown tokens out', () => {
    expect(normalizeScopes(['read', 'admin', 'sudo'])).toEqual(['read'])
  })

  it('dedupes and stable-orders', () => {
    expect(normalizeScopes(['write', 'read', 'write'])).toEqual(['read', 'write'])
  })

  it('rejects garbage-only input by falling back to [read]', () => {
    expect(normalizeScopes(['NOPE'])).toEqual(['read'])
  })
})

describe('rotateApiKey', () => {
  it('returns a fresh plaintext + updated row, preserving id and scopes', async () => {
    qb.single.mockResolvedValue({
      data: {
        id: 'k1',
        workspace_id: 'w1',
        user_id: 'u1',
        name: 'CI runner',
        key_prefix: 'newprefx',
        scopes: ['read'],
        last_used_at: null,
        expires_at: null,
        created_at: '2026-04-28T00:00:00Z',
      },
      error: null,
    })
    const result = await rotateApiKey({ workspaceId: 'w1', keyId: 'k1' })
    expect(result).not.toBeNull()
    expect(result!.plaintext.startsWith('lzx_')).toBe(true)
    expect(result!.row.id).toBe('k1')
    expect(result!.row.scopes).toEqual(['read'])
    // last_used_at must reset \u2014 the rotated value must not surface
    // a stale "last used" timestamp tied to the now-invalid hash.
    expect(result!.row.lastUsedAt).toBeNull()
  })

  it('returns null when the key id is not in the workspace (cross-tenant safe)', async () => {
    qb.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const result = await rotateApiKey({ workspaceId: 'w1', keyId: 'k-other' })
    expect(result).toBeNull()
  })
})
