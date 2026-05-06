import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests #54 audit producers on POST and DELETE of /api/v1/edges.
// Verifies edge.create and edge.delete fire with workflow/source/target
// snapshotted in metadata.

const mockRecordAudit = vi.fn()
const mockResolveAuth = vi.fn()
const mockRequireWorkspaceAuth = vi.fn()
const mockRequireScope = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/utils/route-auth', () => ({
  resolveAuth: (...args: unknown[]) => mockResolveAuth(...args),
  requireWorkspaceAuth: (...args: unknown[]) => mockRequireWorkspaceAuth(...args),
  requireScope: (...args: unknown[]) => mockRequireScope(...args),
}))
vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  RATE_LIMITS: {
    api: { limit: 100, windowMs: 60_000 },
    mutation: { limit: 30, windowMs: 60_000 },
  },
  rateLimitResponse: ({ resetAt }: { resetAt: number }) =>
    new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: { 'x-ratelimit-reset': String(resetAt) },
    }),
}))
vi.mock('@/lib/data/audit-log', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/audit-log')>(
    '@/lib/data/audit-log',
  )
  return {
    ...actual,
    recordAudit: (...args: unknown[]) => mockRecordAudit(...args),
  }
})

// Programmable per-table results: workflows + edges.
const dbState: {
  workflow: { workspace_id: string } | null
  edge: { workflow_id: string; source_id: string; target_id: string } | null
  insertedEdge: { id: string } | null
} = { workflow: null, edge: null, insertedEdge: null }

vi.mock('@/lib/db/client', () => {
  const buildFor = (table: string) => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.eq = vi.fn(() => {
      ;(chain as { then?: unknown }).then = (resolve: (v: { error: null }) => unknown) =>
        Promise.resolve({ error: null }).then(resolve)
      return chain
    })
    chain.single = vi.fn(() => {
      if (table === 'workflows') {
        return Promise.resolve(
          dbState.workflow
            ? { data: dbState.workflow, error: null }
            : { data: null, error: { message: 'not found' } },
        )
      }
      if (table === 'edges') {
        // Two select-single sites: read existing (DELETE path) vs.
        // post-insert. Distinguish by whether `insert` was called on
        // this chain. Cheap: just hand back insertedEdge if set, else
        // the stored edge row.
        if (dbState.insertedEdge) {
          const out = { data: dbState.insertedEdge, error: null }
          dbState.insertedEdge = null
          return Promise.resolve(out)
        }
        return Promise.resolve(
          dbState.edge
            ? { data: dbState.edge, error: null }
            : { data: null, error: { message: 'not found' } },
        )
      }
      return Promise.resolve({ data: null, error: { message: 'unknown table' } })
    })
    return chain
  }
  return {
    db: { from: vi.fn((table: string) => buildFor(table)) },
    hasValidDatabaseUrl: true,
  }
})

import { POST, DELETE } from '@/app/api/v1/edges/route'

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111'
const WORKFLOW_ID = '22222222-2222-4222-8222-222222222222'
const EDGE_ID = '33333333-3333-4333-8333-333333333333'
const SOURCE_ID = '44444444-4444-4444-8444-444444444444'
const TARGET_ID = '55555555-5555-4555-8555-555555555555'

beforeEach(() => {
  mockRecordAudit.mockReset().mockResolvedValue(true)
  mockResolveAuth.mockReset().mockResolvedValue({ ok: true })
  mockRequireWorkspaceAuth.mockReset().mockResolvedValue({
    ok: true,
    userId: 'u-1',
    workspaceId: WORKSPACE_ID,
    rateLimitId: 'rl-u-1',
    viaApiKey: false,
  })
  mockRequireScope.mockReset().mockReturnValue(null)
  mockRateLimit.mockReset().mockReturnValue({ success: true, resetAt: 0, limit: 30, remaining: 29 })
  dbState.workflow = null
  dbState.edge = null
  dbState.insertedEdge = null
})

describe('POST /api/v1/edges — #54 audit producer', () => {
  it('records edge.create with workflow/source/target snapshotted', async () => {
    dbState.workflow = { workspace_id: WORKSPACE_ID }
    dbState.insertedEdge = { id: EDGE_ID }
    const req = new Request('http://test/api/v1/edges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId: WORKFLOW_ID,
        sourceId: SOURCE_ID,
        targetId: TARGET_ID,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.action).toBe('edge.create')
    expect(call.workspaceId).toBe(WORKSPACE_ID)
    expect(call.resourceType).toBe('edge')
    expect(call.resourceId).toBe(EDGE_ID)
    expect(call.metadata).toMatchObject({
      workflowId: WORKFLOW_ID,
      sourceId: SOURCE_ID,
      targetId: TARGET_ID,
      viaApiKey: false,
    })
  })

  it('does not record audit on validation failure', async () => {
    const req = new Request('http://test/api/v1/edges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nope: 1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/v1/edges — #54 audit producer', () => {
  it('records edge.delete with the snapshotted workflow/source/target', async () => {
    dbState.edge = {
      workflow_id: WORKFLOW_ID,
      source_id: SOURCE_ID,
      target_id: TARGET_ID,
    }
    dbState.workflow = { workspace_id: WORKSPACE_ID }
    const req = new Request(`http://test/api/v1/edges?id=${EDGE_ID}`, { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.action).toBe('edge.delete')
    expect(call.resourceId).toBe(EDGE_ID)
    expect(call.metadata).toMatchObject({
      workflowId: WORKFLOW_ID,
      sourceId: SOURCE_ID,
      targetId: TARGET_ID,
    })
  })

  it('returns 400 without recording audit when id is missing', async () => {
    const req = new Request('http://test/api/v1/edges', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })
})
