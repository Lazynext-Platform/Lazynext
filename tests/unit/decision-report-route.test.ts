import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSafeAuth = vi.fn()
const mockVerifyMember = vi.fn()
const mockRateLimit = vi.fn()
const mockLoadReport = vi.fn()

vi.mock('@/lib/utils/auth', () => ({
  safeAuth: (...args: unknown[]) => mockSafeAuth(...args),
  verifyWorkspaceMember: (...args: unknown[]) => mockVerifyMember(...args),
}))
vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  RATE_LIMITS: { export: { limit: 5, windowMs: 60_000 } },
  rateLimitResponse: ({ resetAt }: { resetAt: number }) =>
    new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: { 'x-ratelimit-reset': String(resetAt) },
    }),
}))
vi.mock('@/lib/db/client', () => ({
  hasValidDatabaseUrl: true,
  db: {},
}))
vi.mock('@/lib/data/decision-report', () => ({
  loadDecisionReport: (...args: unknown[]) => mockLoadReport(...args),
}))
vi.mock('@/lib/utils/api-sentry', () => ({
  reportApiError: vi.fn(),
}))
vi.mock('@/lib/utils/api-headers', () => ({
  buildResponseHeaders: () => new Headers(),
  newRequestId: () => 'req-test',
  headersToObject: () => ({}),
}))

import { GET } from '@/app/api/v1/decisions/report/route'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  mockSafeAuth.mockReset()
  mockVerifyMember.mockReset()
  mockRateLimit.mockReset()
  mockLoadReport.mockReset()
  mockRateLimit.mockReturnValue({ success: true, resetAt: 0, limit: 5, remaining: 4 })
})

function buildReq(workspaceId: string | null = VALID_UUID) {
  const url = new URL('http://test/api/v1/decisions/report')
  if (workspaceId) url.searchParams.set('workspaceId', workspaceId)
  return new Request(url, { method: 'GET' })
}

describe('GET /api/v1/decisions/report', () => {
  it('401 when no session', async () => {
    mockSafeAuth.mockResolvedValue({ userId: null })
    const res = await GET(buildReq())
    expect(res.status).toBe(401)
  })

  it('400 when workspaceId is missing', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    const res = await GET(buildReq(null))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_WORKSPACE_ID')
  })

  it('400 when workspaceId is malformed', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    const res = await GET(buildReq('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('403 when caller is not a workspace member', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(false)
    const res = await GET(buildReq())
    expect(res.status).toBe(403)
  })

  it('402 PLAN_LIMIT_REACHED when plan is free', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockLoadReport.mockResolvedValue({
      workspace: { id: 'w1', name: 'Acme', plan: 'free' },
      generatedAt: '2026-05-06',
      decisions: [],
      truncated: false,
      totalCount: 0,
      summary: {
        avgQuality: -1,
        byOutcome: { success: 0, partial: 0, failed: 0, pending: 0 },
        byType: { reversible: 0, irreversible: 0, experimental: 0, unknown: 0 },
      },
    })
    const res = await GET(buildReq())
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toBe('PLAN_LIMIT_REACHED')
    expect(json.variant).toBe('pdf-export')
  })

  it('200 returns text/html with workspace name in body for paid plans', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockLoadReport.mockResolvedValue({
      workspace: { id: 'w1', name: 'Acme Inc', plan: 'starter' },
      generatedAt: '2026-05-06T00:00:00.000Z',
      decisions: [],
      truncated: false,
      totalCount: 0,
      summary: {
        avgQuality: -1,
        byOutcome: { success: 0, partial: 0, failed: 0, pending: 0 },
        byType: { reversible: 0, irreversible: 0, experimental: 0, unknown: 0 },
      },
    })
    const res = await GET(buildReq())
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.text()
    expect(body).toContain('Acme Inc')
    expect(body).toContain('Decision DNA')
  })

  it('404 when workspace does not exist', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockVerifyMember.mockResolvedValue(true)
    mockLoadReport.mockResolvedValue(null)
    const res = await GET(buildReq())
    expect(res.status).toBe(404)
  })

  it('429 when rate-limited', async () => {
    mockSafeAuth.mockResolvedValue({ userId: 'u1' })
    mockRateLimit.mockReturnValue({ success: false, resetAt: 9999, limit: 5, remaining: 0 })
    const res = await GET(buildReq())
    expect(res.status).toBe(429)
  })
})
