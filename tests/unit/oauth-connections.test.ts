import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// `lib/db/client` checks env at import time, so the mock must be set
// up before importing the module under test.
vi.mock('@/lib/db/client', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // Terminator: tests stub these by reassigning.
    _result: { data: [] as Array<Record<string, unknown>> | null, error: null as unknown, count: 0 },
    then(onFulfilled: (v: { data: unknown; error: unknown; count: number }) => unknown) {
      return Promise.resolve(this._result).then(onFulfilled)
    },
  }
  const db = {
    from: vi.fn(() => queryBuilder),
  }
  return {
    db,
    hasValidDatabaseUrl: true,
    looksLikePlaceholder: () => false,
    getDb: () => db,
    __qb: queryBuilder,
  }
})

import {
  listOAuthConnections,
  deleteOAuthConnection,
  getProviderConnectionCounts,
} from '@/lib/data/oauth-connections'

// Pull the shared queryBuilder out of the mock so each test can stub
// the terminator result.
import * as dbModule from '@/lib/db/client'
const qb = (dbModule as unknown as { __qb: { _result: { data: unknown; error: unknown; count: number } } }).__qb

describe('listOAuthConnections', () => {
  beforeEach(() => {
    qb._result = { data: [], error: null, count: 0 }
  })

  it('returns mapped rows with camelCase fields', async () => {
    qb._result = {
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          provider: 'slack',
          external_id: 'T123',
          display_name: 'Acme Slack',
          scopes: 'chat:write channels:read',
          expires_at: '2026-12-31T00:00:00.000Z',
          last_refreshed_at: '2026-04-01T00:00:00.000Z',
          created_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    }
    const rows = await listOAuthConnections('22222222-2222-2222-2222-222222222222')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      provider: 'slack',
      externalId: 'T123',
      displayName: 'Acme Slack',
      scopes: 'chat:write channels:read',
      expiresAt: '2026-12-31T00:00:00.000Z',
      lastRefreshedAt: '2026-04-01T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
    })
  })

  it('NEVER includes the encrypted_tokens column', async () => {
    qb._result = {
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          provider: 'slack',
          external_id: 'T123',
          display_name: null,
          scopes: null,
          expires_at: null,
          last_refreshed_at: null,
          created_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      error: null,
      count: 1,
    }
    const rows = await listOAuthConnections('22222222-2222-2222-2222-222222222222')
    for (const row of rows) {
      expect(row).not.toHaveProperty('encrypted_tokens')
      expect(row).not.toHaveProperty('encryptedTokens')
      expect(row).not.toHaveProperty('access_token')
      expect(row).not.toHaveProperty('refresh_token')
    }
  })

  it('returns [] on a query error rather than throwing', async () => {
    qb._result = { data: null, error: { message: 'boom' }, count: 0 }
    const rows = await listOAuthConnections('22222222-2222-2222-2222-222222222222')
    expect(rows).toEqual([])
  })
})

describe('deleteOAuthConnection', () => {
  it('returns the count from the DB', async () => {
    qb._result = { data: null, error: null, count: 1 }
    const n = await deleteOAuthConnection({
      workspaceId: '22222222-2222-2222-2222-222222222222',
      connectionId: '11111111-1111-1111-1111-111111111111',
    })
    expect(n).toBe(1)
  })

  it('returns 0 on error', async () => {
    qb._result = { data: null, error: { message: 'denied' }, count: 5 }
    const n = await deleteOAuthConnection({
      workspaceId: '22222222-2222-2222-2222-222222222222',
      connectionId: '11111111-1111-1111-1111-111111111111',
    })
    expect(n).toBe(0)
  })

  it('returns 0 when count is null', async () => {
    qb._result = { data: null, error: null, count: 0 }
    const n = await deleteOAuthConnection({
      workspaceId: '22222222-2222-2222-2222-222222222222',
      connectionId: '11111111-1111-1111-1111-111111111111',
    })
    expect(n).toBe(0)
  })
})

describe('getProviderConnectionCounts', () => {
  it('groups rows by provider', async () => {
    qb._result = {
      data: [
        { provider: 'slack' },
        { provider: 'slack' },
        { provider: 'github' },
        { provider: 'notion' },
      ],
      error: null,
      count: 4,
    }
    const counts = await getProviderConnectionCounts('22222222-2222-2222-2222-222222222222')
    expect(counts).toEqual({ slack: 2, github: 1, notion: 1 })
  })

  it('returns {} on error', async () => {
    qb._result = { data: null, error: { message: 'x' }, count: 0 }
    const counts = await getProviderConnectionCounts('22222222-2222-2222-2222-222222222222')
    expect(counts).toEqual({})
  })

  it('returns {} when no rows', async () => {
    qb._result = { data: [], error: null, count: 0 }
    const counts = await getProviderConnectionCounts('22222222-2222-2222-2222-222222222222')
    expect(counts).toEqual({})
  })
})

afterEach(() => {
  vi.clearAllMocks()
})
