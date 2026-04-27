import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('recordAudit', () => {
  it('inserts an audit_log row with extracted ip + user-agent from the request', async () => {
    const { recordAudit } = await import('@/lib/data/audit-log')
    const req = new Request('http://localhost/api/v1/decisions', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.42, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (test)',
      },
    })
    const ok = await recordAudit({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: 'user-a',
      action: 'decision.create',
      resourceType: 'decision',
      resourceId: '11111111-1111-1111-1111-111111111111',
      metadata: { qualityScore: 80 },
      request: req,
    })
    expect(ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('audit_log')
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(row.action).toBe('decision.create')
    expect(row.actor_id).toBe('user-a')
    expect(row.resource_id).toBe('11111111-1111-1111-1111-111111111111')
    expect(row.ip).toBe('203.0.113.42')
    expect(row.user_agent).toBe('Mozilla/5.0 (test)')
    expect(row.metadata).toEqual({ qualityScore: 80 })
  })

  it('returns false on a Supabase error without throwing', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } })
    const { recordAudit } = await import('@/lib/data/audit-log')
    const ok = await recordAudit({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: null,
      action: 'workspace.update',
    })
    expect(ok).toBe(false)
  })

  it('handles requests without forwarded headers (ip and user_agent null)', async () => {
    const { recordAudit } = await import('@/lib/data/audit-log')
    const ok = await recordAudit({
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: 'user-a',
      action: 'node.create',
    })
    expect(ok).toBe(true)
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(row.ip).toBeNull()
    expect(row.user_agent).toBeNull()
  })
})
