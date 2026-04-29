import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db client BEFORE importing the module under test.
const rpc = vi.fn()
vi.mock('@/lib/db/client', () => ({
  db: { rpc: (...args: unknown[]) => rpc(...args) },
  hasValidDatabaseUrl: true,
}))

import { listUserSessions, revokeUserSession } from '@/lib/data/sessions'

describe('listUserSessions', () => {
  beforeEach(() => rpc.mockReset())

  it('calls the list_user_sessions RPC with the user id', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null })
    await listUserSessions('user-1')
    expect(rpc).toHaveBeenCalledWith('list_user_sessions', { p_user_id: 'user-1' })
  })

  it('parses and returns user sessions with parsed device info', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'a1',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0',
          ip: '198.51.100.1',
          created_at: '2026-04-01T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
          refreshed_at: '2026-04-29T01:00:00Z',
          not_after: '2026-05-29T00:00:00Z',
        },
      ],
      error: null,
    })
    const out = await listUserSessions('user-1')
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('a1')
    expect(out[0].ip).toBe('198.51.100.1')
    expect(out[0].device.browser).toBe('Chrome')
    expect(out[0].device.os).toBe('macOS')
    expect(out[0].device.device).toBe('Desktop')
  })

  it('returns [] when RPC returns null data', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    const out = await listUserSessions('user-1')
    expect(out).toEqual([])
  })

  it('throws when RPC reports an error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('rpc failed') })
    await expect(listUserSessions('user-1')).rejects.toThrow('rpc failed')
  })
})

describe('revokeUserSession', () => {
  beforeEach(() => rpc.mockReset())

  it('calls the revoke_user_session RPC scoped by user', async () => {
    rpc.mockResolvedValueOnce({ data: 1, error: null })
    await revokeUserSession('user-1', 'sess-1')
    expect(rpc).toHaveBeenCalledWith('revoke_user_session', {
      p_session_id: 'sess-1',
      p_user_id: 'user-1',
    })
  })

  it('returns true when RPC reports a row was deleted', async () => {
    rpc.mockResolvedValueOnce({ data: 1, error: null })
    expect(await revokeUserSession('user-1', 'sess-1')).toBe(true)
  })

  it('returns false when RPC reports no rows deleted', async () => {
    rpc.mockResolvedValueOnce({ data: 0, error: null })
    expect(await revokeUserSession('user-1', 'sess-1')).toBe(false)
  })

  it('returns false when RPC returns non-numeric data', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    expect(await revokeUserSession('user-1', 'sess-1')).toBe(false)
  })

  it('throws when RPC reports an error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('forbidden') })
    await expect(revokeUserSession('user-1', 'sess-1')).rejects.toThrow('forbidden')
  })
})
