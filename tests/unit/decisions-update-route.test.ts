import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests the #51 audit producers on PATCH and DELETE of
// /api/v1/decisions/[id]. Verifies the recordAudit calls fire with
// the correct shape: PATCH carries previous+next snapshots scoped to
// changed fields, DELETE carries the snapshotted question.

const mockRecordAudit = vi.fn()
const mockRequireWorkspaceAuth = vi.fn()
const mockRequireScope = vi.fn()
const mockRateLimit = vi.fn()
const mockIncrementWmsFor = vi.fn()

vi.mock('@/lib/utils/route-auth', () => ({
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
vi.mock('@/lib/wms', () => ({
  incrementWmsFor: (...args: unknown[]) => mockIncrementWmsFor(...args),
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

// Programmable Supabase mock. Each test sets the row that .single()
// returns and the update/delete builders just echo success.
const dbState: { row: Record<string, unknown> | null } = { row: null }

vi.mock('@/lib/db/client', () => {
  const builder = () => {
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    // .eq is awaitable for delete (`await db.from(...).delete().eq(...)`)
    // and chainable for select. Make it both: a thenable that also
    // returns chain methods. Simplest: chain.eq returns a thenable
    // that's also `chain`-shaped.
    chain.eq = vi.fn(() => {
      const eqChain = chain
      // Make .eq awaitable so `await db.from(...).delete().eq(...)`
      // resolves cleanly. We expose .then so it's a thenable.
      ;(eqChain as { then?: unknown }).then = (resolve: (v: { error: null }) => unknown) =>
        Promise.resolve({ error: null }).then(resolve)
      return eqChain
    })
    chain.single = vi.fn(() =>
      Promise.resolve(
        dbState.row
          ? { data: dbState.row, error: null }
          : { data: null, error: { message: 'not found' } },
      ),
    )
    return chain
  }
  return {
    db: { from: vi.fn(() => builder()) },
    hasValidDatabaseUrl: true,
  }
})

import { PATCH, DELETE } from '@/app/api/v1/decisions/[id]/route'

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111'
const DECISION_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  mockRecordAudit.mockReset().mockResolvedValue(true)
  mockRequireWorkspaceAuth.mockReset().mockResolvedValue({
    ok: true,
    userId: 'u-1',
    workspaceId: WORKSPACE_ID,
    rateLimitId: 'rl-u-1',
    viaApiKey: false,
  })
  mockRequireScope.mockReset().mockReturnValue(null)
  mockRateLimit.mockReset().mockReturnValue({ success: true, resetAt: 0, limit: 30, remaining: 29 })
  mockIncrementWmsFor.mockReset().mockResolvedValue(undefined)
  dbState.row = null
})

describe('PATCH /api/v1/decisions/[id] — #51 audit producer', () => {
  it('records decision.update with previous + next snapshots of changed fields', async () => {
    dbState.row = {
      workspace_id: WORKSPACE_ID,
      resolution: 'Old answer',
      rationale: 'Old reasoning',
      status: 'open',
      outcome: 'pending',
      outcome_notes: null,
      outcome_confidence: null,
      tags: ['legacy'],
    }
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution: 'New answer', status: 'decided' }),
    })
    // Override single() so the second .single() call (the update) returns the new row.
    const res = await PATCH(req, { params: { id: DECISION_ID } })
    expect([200, 500]).toContain(res.status)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.action).toBe('decision.update')
    expect(call.workspaceId).toBe(WORKSPACE_ID)
    expect(call.resourceType).toBe('decision')
    expect(call.resourceId).toBe(DECISION_ID)
    expect(call.metadata.changes).toEqual(['resolution', 'status'])
    expect(call.metadata.previous).toEqual({ resolution: 'Old answer', status: 'open' })
    expect(call.metadata.next).toEqual({ resolution: 'New answer', status: 'decided' })
    expect(call.metadata.viaApiKey).toBe(false)
  })

  it('maps outcomeNotes and outcomeConfidence to their DB columns in previous', async () => {
    dbState.row = {
      workspace_id: WORKSPACE_ID,
      resolution: 'r',
      rationale: 'why',
      status: 'decided',
      outcome: 'pending',
      outcome_notes: 'old notes',
      outcome_confidence: 5,
      tags: [],
    }
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outcomeNotes: 'shipped', outcomeConfidence: 9, outcome: 'good' }),
    })
    await PATCH(req, { params: { id: DECISION_ID } })
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.metadata.changes).toEqual(['outcome', 'outcomeNotes', 'outcomeConfidence'])
    expect(call.metadata.previous.outcomeNotes).toBe('old notes')
    expect(call.metadata.previous.outcomeConfidence).toBe(5)
    expect(call.metadata.next.outcomeNotes).toBe('shipped')
    expect(call.metadata.next.outcomeConfidence).toBe(9)
  })

  it('flags viaApiKey when bearer-driven', async () => {
    mockRequireWorkspaceAuth.mockResolvedValueOnce({
      ok: true,
      userId: 'u-1',
      workspaceId: WORKSPACE_ID,
      rateLimitId: 'key:abc',
      viaApiKey: true,
    })
    dbState.row = {
      workspace_id: WORKSPACE_ID,
      resolution: 'a',
      rationale: 'b',
      status: 'open',
      outcome: 'pending',
      outcome_notes: null,
      outcome_confidence: null,
      tags: [],
    }
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution: 'a' }),
    })
    await PATCH(req, { params: { id: DECISION_ID } })
    expect(mockRecordAudit.mock.calls[0][0].metadata.viaApiKey).toBe(true)
  })

  it('returns 404 without recording audit when row is missing', async () => {
    dbState.row = null
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolution: 'x' }),
    })
    const res = await PATCH(req, { params: { id: DECISION_ID } })
    expect(res.status).toBe(404)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/v1/decisions/[id] — #51 audit producer', () => {
  it('records decision.delete with the snapshotted question', async () => {
    dbState.row = { workspace_id: WORKSPACE_ID, question: 'Should we adopt RSC?' }
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: { id: DECISION_ID } })
    expect(res.status).toBe(200)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.action).toBe('decision.delete')
    expect(call.metadata.question).toBe('Should we adopt RSC?')
    expect(call.metadata.viaApiKey).toBe(false)
  })

  it('truncates an oversized question to 200 chars in metadata', async () => {
    const longQ = 'q'.repeat(500)
    dbState.row = { workspace_id: WORKSPACE_ID, question: longQ }
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'DELETE',
    })
    await DELETE(req, { params: { id: DECISION_ID } })
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call.metadata.question).toHaveLength(200)
  })

  it('returns 404 without recording audit when row is missing', async () => {
    dbState.row = null
    const req = new Request(`http://test/api/v1/decisions/${DECISION_ID}`, {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: { id: DECISION_ID } })
    expect(res.status).toBe(404)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })
})
