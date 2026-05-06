import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all server-side dependencies the route reaches into. We test the
// route's CONTROL FLOW (auth → rate-limit → quota → generator → audit)
// not the integrations themselves — those have their own suites.

const mockSafeAuth = vi.fn()
const mockVerifyMember = vi.fn()
const mockRateLimit = vi.fn()
const mockCheckQuota = vi.fn()
const mockRecordUsage = vi.fn()
const mockGenerate = vi.fn()
const mockRecordAudit = vi.fn()
const mockReportApiError = vi.fn()

vi.mock('@/lib/utils/auth', () => ({
  safeAuth: (...args: unknown[]) => mockSafeAuth(...args),
  verifyWorkspaceMember: (...args: unknown[]) => mockVerifyMember(...args),
}))
vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  RATE_LIMITS: { ai: { limit: 30, windowMs: 60_000 } },
  rateLimitResponse: ({ resetAt }: { resetAt: number }) =>
    new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: { 'x-ratelimit-reset': String(resetAt) },
    }),
}))
vi.mock('@/lib/data/ai-usage', () => ({
  checkAiQuota: (...args: unknown[]) => mockCheckQuota(...args),
  recordAiUsage: (...args: unknown[]) => mockRecordUsage(...args),
}))
vi.mock('@/lib/ai/workflow-generator', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/workflow-generator')>(
    '@/lib/ai/workflow-generator',
  )
  return {
    ...actual,
    generateWorkflow: (...args: unknown[]) => mockGenerate(...args),
  }
})
vi.mock('@/lib/data/audit-log', () => ({
  recordAudit: (...args: unknown[]) => mockRecordAudit(...args),
}))
vi.mock('@/lib/utils/api-sentry', () => ({
  reportApiError: (...args: unknown[]) => mockReportApiError(...args),
}))
vi.mock('@/lib/utils/api-headers', () => ({
  buildResponseHeaders: () => new Headers(),
  newRequestId: () => 'req-test',
  headersToObject: () => ({}),
}))

import { POST } from '@/app/api/v1/ai/workflow/route'
import { WorkflowGenerationError } from '@/lib/ai/workflow-generator'

// Real UUID v4 — Zod's .uuid() requires the version + variant bits.
const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111'

function buildReq(body: unknown) {
  return new Request('http://test/api/v1/ai/workflow', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSafeAuth.mockReset()
  mockVerifyMember.mockReset()
  mockRateLimit.mockReset()
  mockCheckQuota.mockReset()
  mockRecordUsage.mockReset()
  mockGenerate.mockReset()
  mockRecordAudit.mockReset()
  mockReportApiError.mockReset()
  // Default-allow for happy path
  mockRateLimit.mockReturnValue({ success: true, resetAt: 0, limit: 30, remaining: 29 })
  mockCheckQuota.mockResolvedValue({ allowed: true, used: 0, limit: 100, plan: 'free' })
})

describe('POST /api/v1/ai/workflow', () => {
  it('401 when no session', async () => {
    mockSafeAuth.mockResolvedValue({ userId: null })
    const res = await POST(buildReq({ prompt: 'x', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(401)
  })

  it('400 INVALID_JSON when body is not JSON', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    const req = new Request('http://test/api/v1/ai/workflow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_JSON')
  })

  it('400 VALIDATION_ERROR on bad shape', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    const res = await POST(buildReq({ prompt: '', workspaceId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
  })

  it('403 when caller is not a member', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(false)
    const res = await POST(buildReq({ prompt: 'plan', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(403)
  })

  it('402 PLAN_LIMIT_REACHED when quota exhausted', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockCheckQuota.mockResolvedValue({ allowed: false, used: 100, limit: 100, plan: 'free' })
    const res = await POST(buildReq({ prompt: 'plan', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toBe('PLAN_LIMIT_REACHED')
    expect(json.variant).toBe('ai-limit')
  })

  it('429 when rate-limit bucket is empty', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockRateLimit.mockReturnValue({ success: false, resetAt: 9999, limit: 30, remaining: 0 })
    const res = await POST(buildReq({ prompt: 'plan', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(429)
  })

  it('200 happy path returns generated graph + records usage + audit', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockGenerate.mockResolvedValue({
      nodes: [{ tempId: 'n1', type: 'task', title: 'Do thing' }],
      edges: [],
      rationale: 'Single step.',
      provider: 'groq',
      model: 'groq:llama-3.3-70b-versatile',
    })
    const res = await POST(buildReq({ prompt: 'plan a thing', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.error).toBeNull()
    expect(json.data.nodes).toHaveLength(1)
    expect(mockRecordUsage).toHaveBeenCalledWith('u1', WORKSPACE_ID)
    expect(mockRecordAudit).toHaveBeenCalledTimes(1)
    expect(mockRecordAudit.mock.calls[0][0]).toMatchObject({
      action: 'ai.workflow.generated',
      workspaceId: WORKSPACE_ID,
    })
  })

  it('503 AI_UNAVAILABLE when generator throws AI_NOT_CONFIGURED', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockGenerate.mockRejectedValue(
      new WorkflowGenerationError('AI_NOT_CONFIGURED', 'no keys'),
    )
    const res = await POST(buildReq({ prompt: 'plan', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toBe('AI_UNAVAILABLE')
  })

  it('502 WORKFLOW_GENERATION_FAILED on schema-invalid', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockGenerate.mockRejectedValue(
      new WorkflowGenerationError('SCHEMA_INVALID', 'bad json from llm'),
    )
    const res = await POST(buildReq({ prompt: 'plan', workspaceId: WORKSPACE_ID }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBe('WORKFLOW_GENERATION_FAILED')
  })
})
