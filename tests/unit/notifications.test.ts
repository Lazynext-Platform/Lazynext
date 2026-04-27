import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock the db module so createNotification can be exercised without
// a live Supabase connection. The shape only needs `.from(...).insert(...)`.
const insertMock = vi.fn<(payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>>(
  () => Promise.resolve({ error: null })
)
const fromMock = vi.fn(() => ({ insert: insertMock }))

vi.mock('@/lib/db/client', () => ({
  db: { from: fromMock },
  hasValidDatabaseUrl: true,
}))

beforeEach(() => {
  insertMock.mockClear()
  fromMock.mockClear()
})

describe('createNotification', () => {
  it('returns false and does not insert when actor === recipient (no self-notify)', async () => {
    const { createNotification } = await import('@/lib/data/notifications')
    const ok = await createNotification({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-a',
      actorId: 'user-a',
      type: 'task_assigned',
      title: 'You assigned yourself',
    })
    expect(ok).toBe(false)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts with normalized payload when actor differs from recipient', async () => {
    const { createNotification } = await import('@/lib/data/notifications')
    const ok = await createNotification({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-b',
      actorId: 'user-a',
      type: 'decision_logged',
      title: 'New decision logged',
      body: 'Should we ship?',
      link: '/workspace/x/decisions/abc',
      relatedDecisionId: 'dec-1',
    })
    expect(ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('notifications')
    expect(insertMock).toHaveBeenCalledTimes(1)
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(row.workspace_id).toBe('00000000-0000-0000-0000-000000000001')
    expect(row.user_id).toBe('user-b')
    expect(row.actor_id).toBe('user-a')
    expect(row.type).toBe('decision_logged')
    expect(row.related_decision_id).toBe('dec-1')
    expect(row.related_node_id).toBeNull()
    expect(row.related_thread_id).toBeNull()
    expect(row.read_at).toBeUndefined() // never set on insert
  })

  it('returns false on a Supabase error without throwing', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } })
    const { createNotification } = await import('@/lib/data/notifications')
    const ok = await createNotification({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-c',
      actorId: 'user-a',
      type: 'thread_mention',
      title: 'mention',
    })
    expect(ok).toBe(false)
  })

  it('allows null actor (system events)', async () => {
    const { createNotification } = await import('@/lib/data/notifications')
    const ok = await createNotification({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      userId: 'user-c',
      actorId: null,
      type: 'task_due_soon',
      title: 'A task is due soon',
    })
    expect(ok).toBe(true)
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(row.actor_id).toBeNull()
  })
})
