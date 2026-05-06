import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the bearer/cookie split for /api/v1/decisions/report (#49).
// We mock requireWorkspaceAuth, the loader, and the renderer — the
// route's job is to choose autoPrint based on viaApiKey, pass through
// the workspace plan gate, and emit the right headers.

const mockRequireWorkspaceAuth = vi.fn()
const mockLoadReport = vi.fn()
const mockRender = vi.fn()
const mockHasFeature = vi.fn()
const mockRateLimit = vi.fn()

vi.mock('@/lib/utils/route-auth', () => ({
  requireWorkspaceAuth: (...a: unknown[]) => mockRequireWorkspaceAuth(...a),
}))
vi.mock('@/lib/data/decision-report', () => ({
  loadDecisionReport: (...a: unknown[]) => mockLoadReport(...a),
}))
vi.mock('@/lib/reports/decision-html', () => ({
  renderDecisionReportHtml: (...a: unknown[]) => mockRender(...a),
}))
vi.mock('@/lib/utils/plan-gates', () => ({
  hasFeature: (...a: unknown[]) => mockHasFeature(...a),
}))
vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
  RATE_LIMITS: { export: { limit: 10, windowMs: 60_000 } },
  rateLimitResponse: ({ resetAt }: { resetAt: number }) =>
    new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: { 'x-ratelimit-reset': String(resetAt) },
    }),
}))
vi.mock('@/lib/db/client', () => ({ hasValidDatabaseUrl: true }))
vi.mock('@/lib/utils/api-headers', () => ({
  buildResponseHeaders: () => new Headers(),
  newRequestId: () => 'req-test',
  headersToObject: () => ({}),
}))
vi.mock('@/lib/utils/api-sentry', () => ({
  reportApiError: vi.fn(),
}))

import { GET } from '@/app/api/v1/decisions/report/route'

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111'

const REPORT = {
  workspace: { id: WORKSPACE_ID, name: 'Acme', plan: 'business' },
  decisions: [],
  totalCount: 0,
  truncated: false,
  generatedAt: new Date('2026-05-06T12:00:00Z'),
}

beforeEach(() => {
  mockRequireWorkspaceAuth.mockReset()
  mockLoadReport.mockReset()
  mockRender.mockReset()
  mockHasFeature.mockReset()
  mockRateLimit.mockReset()
  mockRateLimit.mockReturnValue({ success: true, resetAt: 0, limit: 10, remaining: 9 })
  mockHasFeature.mockReturnValue(true)
  mockLoadReport.mockResolvedValue(REPORT)
  mockRender.mockReturnValue('<!doctype html><html></html>')
})

describe('GET /api/v1/decisions/report (#49 bearer + cookie)', () => {
  it('400 when workspaceId is missing', async () => {
    const res = await GET(new Request('http://test/api/v1/decisions/report'))
    expect(res.status).toBe(400)
    expect(mockRequireWorkspaceAuth).not.toHaveBeenCalled()
  })

  it('400 when workspaceId is not a UUID', async () => {
    const res = await GET(
      new Request('http://test/api/v1/decisions/report?workspaceId=not-a-uuid'),
    )
    expect(res.status).toBe(400)
  })

  it('passes through requireWorkspaceAuth failure (401/403)', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'WORKSPACE_MISMATCH' }), { status: 403 }),
    })
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(403)
  })

  it('cookie session: renders HTML with autoPrint = true', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'u-1',
      viaApiKey: false,
      rateLimitId: 'user:u-1',
    })
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(mockRender).toHaveBeenCalledWith(REPORT, { autoPrint: true })
  })

  it('bearer auth: renders HTML with autoPrint = false', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'svc-account',
      viaApiKey: true,
      rateLimitId: 'key:k-1',
    })
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(200)
    expect(mockRender).toHaveBeenCalledWith(REPORT, { autoPrint: false })
  })

  it('rate-limit bucket scopes by rateLimitId (key vs user)', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'u-1',
      viaApiKey: true,
      rateLimitId: 'key:k-1',
    })
    await GET(new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`))
    expect(mockRateLimit).toHaveBeenCalledWith('export:key:k-1', expect.any(Object))
  })

  it('429 when export bucket is empty', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'u-1',
      viaApiKey: false,
      rateLimitId: 'user:u-1',
    })
    mockRateLimit.mockReturnValue({ success: false, resetAt: 9999, limit: 10, remaining: 0 })
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(429)
  })

  it('402 PLAN_LIMIT_REACHED when workspace plan lacks pdf-export', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'u-1',
      viaApiKey: false,
      rateLimitId: 'user:u-1',
    })
    mockHasFeature.mockReturnValue(false)
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toBe('PLAN_LIMIT_REACHED')
  })

  it('404 when workspace not found', async () => {
    mockRequireWorkspaceAuth.mockResolvedValue({
      ok: true,
      userId: 'u-1',
      viaApiKey: false,
      rateLimitId: 'user:u-1',
    })
    mockLoadReport.mockResolvedValue(null)
    const res = await GET(
      new Request(`http://test/api/v1/decisions/report?workspaceId=${WORKSPACE_ID}`),
    )
    expect(res.status).toBe(404)
  })
})
