import { describe, it, expect, vi, beforeEach } from 'vitest'

// Captures every (table, op) pair the helpers touch. Tests assert on it.
const insertMock = vi.fn<(payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>>(
  () => Promise.resolve({ error: null })
)
const upsertMock = vi.fn<(payload: Record<string, unknown>, opts?: unknown) => Promise<{ error: { message: string } | null }>>(
  () => Promise.resolve({ error: null })
)

const fromMock = vi.fn((_table: string) => ({
  insert: insertMock,
  upsert: upsertMock,
  select: () => ({
    eq: (_c1: string, _v1: string) => ({
      eq: (_c2: string, _v2: string) => Promise.resolve({ data: [], error: null }),
    }),
  }),
}))

vi.mock('@/lib/db/client', () => ({
  db: { from: fromMock },
  hasValidDatabaseUrl: true,
}))

beforeEach(() => {
  insertMock.mockClear()
  upsertMock.mockClear()
  fromMock.mockClear()
})

describe('upsertPreference', () => {
  it('writes a (workspace, user, type) row with onConflict on the unique key', async () => {
    const { upsertPreference } = await import('@/lib/data/notification-preferences')
    const ok = await upsertPreference({
      userId: 'user-a',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      type: 'task_assigned',
      in_app: false,
      email: true,
    })
    expect(ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('notification_preferences')
    expect(upsertMock).toHaveBeenCalledTimes(1)
    const [payload, opts] = upsertMock.mock.calls[0] as [Record<string, unknown>, { onConflict: string }]
    expect(payload.user_id).toBe('user-a')
    expect(payload.type).toBe('task_assigned')
    expect(payload.in_app).toBe(false)
    expect(payload.email).toBe(true)
    expect(opts.onConflict).toBe('workspace_id,user_id,type')
  })

  it('defaults email=false when not provided', async () => {
    const { upsertPreference } = await import('@/lib/data/notification-preferences')
    await upsertPreference({
      userId: 'user-b',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      type: 'decision_logged',
      in_app: true,
    })
    const [payload] = upsertMock.mock.calls[0] as [Record<string, unknown>]
    expect(payload.email).toBe(false)
    expect(payload.in_app).toBe(true)
  })
})

describe('getPreferences', () => {
  it('returns one row per notification type with sensible defaults', async () => {
    const { getPreferences, NOTIFICATION_TYPES } = await import('@/lib/data/notification-preferences')
    const prefs = await getPreferences({
      userId: 'user-c',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    })
    expect(prefs).toHaveLength(NOTIFICATION_TYPES.length)
    for (const p of prefs) {
      expect(p.in_app).toBe(true)
      expect(p.email).toBe(false)
    }
  })
})
