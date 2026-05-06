import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the POST /api/v1/audit-log route's control flow. Auth, the DB
// client, rate-limit, and `recordAudit` are all mocked — we want to
// confirm action allowlisting, validation, metadata sanitisation, and
// the success path, not the inserts themselves.

const mockRecordAudit = vi.fn()
const mockRequireWorkspaceAuth = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/utils/route-auth', () => ({
  requireWorkspaceAuth: (...args: unknown[]) => mockRequireWorkspaceAuth(...args),
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
    listAuditLog: vi.fn(async () => ({ items: [], nextCursor: null })),
  }
})
vi.mock('@/lib/db/client', () => ({
  db: { from: vi.fn() },
  hasValidDatabaseUrl: true,
}))
vi.mock('@/lib/utils/plan-gates', () => ({
  hasFeature: vi.fn(() => true),
}))

import { POST } from '@/app/api/v1/audit-log/route'

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111'

function buildReq(body: unknown): Request {
  return new Request('http://test/api/v1/audit-log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  mockRecordAudit.mockReset()
  mockRequireWorkspaceAuth.mockReset()
  mockRateLimit.mockReset()
  mockRateLimit.mockReturnValue({ success: true, resetAt: 0, limit: 30, remaining: 29 })
  mockRequireWorkspaceAuth.mockResolvedValue({
    ok: true,
    userId: 'u-1',
    workspaceId: WORKSPACE_ID,
    rateLimitId: 'rl-u-1',
    viaApiKey: false,
  })
  mockRecordAudit.mockResolvedValue(true)
})

describe('POST /api/v1/audit-log', () => {
  it('400 INVALID_JSON for malformed body', async () => {
    const res = await POST(buildReq('not-json{'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('INVALID_JSON')
  })

  it('400 MISSING_WORKSPACE_ID when workspaceId is absent', async () => {
    const res = await POST(buildReq({ action: 'ai.workflow.accepted' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('MISSING_WORKSPACE_ID')
  })

  it('400 ACTION_NOT_ALLOWED for server-only actions like decision.delete', async () => {
    const res = await POST(buildReq({ workspaceId: WORKSPACE_ID, action: 'decision.delete' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('ACTION_NOT_ALLOWED')
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })

  it('400 ACTION_NOT_ALLOWED for server-only ai.workflow.generated', async () => {
    const res = await POST(
      buildReq({ workspaceId: WORKSPACE_ID, action: 'ai.workflow.generated' }),
    )
    expect(res.status).toBe(400)
    expect(mockRecordAudit).not.toHaveBeenCalled()
  })

  it('400 ACTION_NOT_ALLOWED for unknown actions', async () => {
    const res = await POST(buildReq({ workspaceId: WORKSPACE_ID, action: 'foo.bar' }))
    expect(res.status).toBe(400)
  })

  it('passes through requireWorkspaceAuth response on auth failure', async () => {
    mockRequireWorkspaceAuth.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
    })
    const res = await POST(
      buildReq({ workspaceId: WORKSPACE_ID, action: 'ai.workflow.accepted' }),
    )
    expect(res.status).toBe(401)
  })

  it('429 when rate-limit bucket is empty', async () => {
    mockRateLimit.mockReturnValue({ success: false, resetAt: 9999, limit: 30, remaining: 0 })
    const res = await POST(
      buildReq({ workspaceId: WORKSPACE_ID, action: 'ai.workflow.accepted' }),
    )
    expect(res.status).toBe(429)
  })

  it('201 happy path records ai.workflow.accepted with sanitised metadata', async () => {
    const res = await POST(
      buildReq({
        workspaceId: WORKSPACE_ID,
        action: 'ai.workflow.accepted',
        metadata: {
          prompt: 'Plan a launch',
          nodeCount: 5,
          edgeCount: 4,
          refineCount: 1,
          // attacker-supplied junk that must be ignored
          actor_id: 'spoof',
          ip: '127.0.0.1',
          rogue: { nested: 'payload' },
        },
      }),
    )
    expect(res.status).toBe(201)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    const call = mockRecordAudit.mock.calls[0][0]
    expect(call).toMatchObject({
      workspaceId: WORKSPACE_ID,
      actorId: 'u-1',
      action: 'ai.workflow.accepted',
    })
    expect(call.metadata).toEqual({
      viaApiKey: false,
      prompt: 'Plan a launch',
      nodeCount: 5,
      edgeCount: 4,
      refineCount: 1,
    })
    expect(call.metadata.actor_id).toBeUndefined()
    expect(call.metadata.rogue).toBeUndefined()
  })

  it('truncates prompt to 500 chars and floors counts', async () => {
    const longPrompt = 'a'.repeat(800)
    const res = await POST(
      buildReq({
        workspaceId: WORKSPACE_ID,
        action: 'ai.workflow.refined',
        metadata: {
          prompt: longPrompt,
          nodeCount: 4.7,
          edgeCount: -3,
          refineCount: 999.999,
        },
      }),
    )
    expect(res.status).toBe(201)
    const meta = mockRecordAudit.mock.calls[0][0].metadata
    expect(meta.prompt).toHaveLength(500)
    expect(meta.nodeCount).toBe(4)
    expect(meta.edgeCount).toBe(0)
    expect(meta.refineCount).toBe(999)
  })

  it('records viaApiKey: true when bearer auth is used', async () => {
    mockRequireWorkspaceAuth.mockResolvedValueOnce({
      ok: true,
      userId: 'svc-account',
      workspaceId: WORKSPACE_ID,
      rateLimitId: 'rl-bearer',
      viaApiKey: true,
    })
    await POST(
      buildReq({ workspaceId: WORKSPACE_ID, action: 'ai.workflow.accepted' }),
    )
    expect(mockRecordAudit.mock.calls[0][0].metadata).toMatchObject({ viaApiKey: true })
  })

  it('500 AUDIT_WRITE_FAILED when recordAudit returns false', async () => {
    mockRecordAudit.mockResolvedValueOnce(false)
    const res = await POST(
      buildReq({ workspaceId: WORKSPACE_ID, action: 'ai.workflow.accepted' }),
    )
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('AUDIT_WRITE_FAILED')
  })
})
