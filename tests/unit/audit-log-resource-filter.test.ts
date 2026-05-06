import { describe, it, expect, vi, beforeEach } from 'vitest'

// Verify listAuditLog applies the resourceType + resourceId filter
// pair (#52). We trace which Supabase query-builder methods get
// called rather than running a real DB.

interface QueryRecorder {
  calls: Array<{ method: string; args: unknown[] }>
}

function buildQuery(rec: QueryRecorder, rows: unknown[] = []) {
  const q: Record<string, unknown> = {}
  const chain = (method: string) => (...args: unknown[]) => {
    rec.calls.push({ method, args })
    return q
  }
  q.select = chain('select')
  q.eq = chain('eq')
  q.order = chain('order')
  q.limit = chain('limit')
  q.lt = chain('lt')
  q.gte = chain('gte')
  // Awaiting the builder resolves to { data, error }.
  ;(q as { then?: unknown }).then = (
    onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
  ) => Promise.resolve({ data: rows, error: null }).then(onFulfilled)
  return q
}

const recorder: QueryRecorder = { calls: [] }

vi.mock('@/lib/db/client', () => ({
  db: {
    from: () => buildQuery(recorder),
    auth: { admin: { listUsers: async () => ({ data: { users: [] } }) } },
  },
  hasValidDatabaseUrl: true,
}))

beforeEach(() => {
  recorder.calls = []
})

describe('listAuditLog (#52 resource filter)', () => {
  it('applies workspace_id, action, sinceIso, and resource pair eq() clauses', async () => {
    const { listAuditLog } = await import('@/lib/data/audit-log')
    await listAuditLog({
      workspaceId: 'ws-1',
      action: 'node.update',
      sinceIso: '2026-01-01T00:00:00.000Z',
      resourceType: 'node',
      resourceId: 'node-uuid',
    })
    const eqArgs = recorder.calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toContainEqual(['workspace_id', 'ws-1'])
    expect(eqArgs).toContainEqual(['action', 'node.update'])
    expect(eqArgs).toContainEqual(['resource_type', 'node'])
    expect(eqArgs).toContainEqual(['resource_id', 'node-uuid'])
    const gteCall = recorder.calls.find((c) => c.method === 'gte')
    expect(gteCall?.args).toEqual(['created_at', '2026-01-01T00:00:00.000Z'])
  })

  it('skips the resource filter when only resourceType is set', async () => {
    const { listAuditLog } = await import('@/lib/data/audit-log')
    await listAuditLog({ workspaceId: 'ws-1', resourceType: 'node', resourceId: null })
    const eqArgs = recorder.calls.filter((c) => c.method === 'eq').map((c) => c.args[0])
    expect(eqArgs).not.toContain('resource_type')
    expect(eqArgs).not.toContain('resource_id')
  })

  it('skips the resource filter when only resourceId is set', async () => {
    const { listAuditLog } = await import('@/lib/data/audit-log')
    await listAuditLog({ workspaceId: 'ws-1', resourceType: null, resourceId: 'node-uuid' })
    const eqArgs = recorder.calls.filter((c) => c.method === 'eq').map((c) => c.args[0])
    expect(eqArgs).not.toContain('resource_type')
    expect(eqArgs).not.toContain('resource_id')
  })
})
