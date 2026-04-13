import { describe, it, expect, vi, beforeEach } from 'vitest'

// Reuse mocks from existing test
vi.mock('@/lib/db/client', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', question: 'test', status: 'active' }, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
  hasValidDatabaseUrl: true,
}))

vi.mock('@/lib/utils/auth', () => ({
  safeAuth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true })),
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'RATE_LIMIT' }), { status: 429 })),
  RATE_LIMITS: { ai: { max: 50, windowMs: 60000 } },
}))

vi.mock('@/lib/ai/lazymind', () => ({
  callLazyMind: vi.fn(() => Promise.resolve({ content: 'AI response', provider: 'groq' })),
  hasAIKeys: true,
}))

vi.mock('@/lib/ai/decision-quality', () => ({
  computeDecisionQualityScore: vi.fn(() => 75),
}))

vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: vi.fn(),
  createCheckout: vi.fn(() => Promise.resolve({ data: { data: { attributes: { url: 'https://checkout.lemonsqueezy.com/test' } } } })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// Edges
// ============================================================
describe('API Routes - Edges', () => {
  it('should reject unauthenticated GET', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/edges/route')
    const req = new Request('http://localhost:3000/api/v1/edges?workflowId=test-wf')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('should validate POST body', async () => {
    const { POST } = await import('@/app/api/v1/edges/route')
    const req = new Request('http://localhost:3000/api/v1/edges', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should reject malformed JSON on POST', async () => {
    const { POST } = await import('@/app/api/v1/edges/route')
    const req = new Request('http://localhost:3000/api/v1/edges', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_JSON')
  })
})

// ============================================================
// Workflows [id]
// ============================================================
describe('API Routes - Workflows [id]', () => {
  it('should reject unauthenticated GET', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/workflows/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/workflows/test-id')
    const res = await GET(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(401)
  })

  it('should validate PATCH body', async () => {
    const { PATCH } = await import('@/app/api/v1/workflows/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/workflows/test-id', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(400)
  })

  it('should reject unauthenticated DELETE', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { DELETE } = await import('@/app/api/v1/workflows/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/workflows/test-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(401)
  })
})

// ============================================================
// Nodes [id]
// ============================================================
describe('API Routes - Nodes [id]', () => {
  it('should reject unauthenticated GET', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/nodes/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/nodes/test-id')
    const res = await GET(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(401)
  })

  it('should validate PATCH body', async () => {
    const { PATCH } = await import('@/app/api/v1/nodes/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/nodes/test-id', {
      method: 'PATCH',
      body: JSON.stringify({ title: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(400)
  })

  it('should reject malformed JSON on PATCH', async () => {
    const { PATCH } = await import('@/app/api/v1/nodes/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/nodes/test-id', {
      method: 'PATCH',
      body: 'bad-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_JSON')
  })
})

// ============================================================
// Decisions [id]
// ============================================================
describe('API Routes - Decisions [id]', () => {
  it('should reject unauthenticated GET', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/decisions/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/decisions/test-id')
    const res = await GET(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated DELETE', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { DELETE } = await import('@/app/api/v1/decisions/[id]/route')
    const req = new Request('http://localhost:3000/api/v1/decisions/test-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'test-id' } })
    expect(res.status).toBe(401)
  })
})

// ============================================================
// Decisions Search
// ============================================================
describe('API Routes - Decision Search', () => {
  it('should reject unauthenticated POST', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/decisions/search/route')
    const req = new Request('http://localhost:3000/api/v1/decisions/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test', workspaceId: 'ws-1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should require query and workspaceId', async () => {
    const { POST } = await import('@/app/api/v1/decisions/search/route')
    const req = new Request('http://localhost:3000/api/v1/decisions/search', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ============================================================
// Threads [nodeId]
// ============================================================
describe('API Routes - Threads', () => {
  it('should reject unauthenticated GET', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/threads/[nodeId]/route')
    const req = new Request('http://localhost:3000/api/v1/threads/node-1')
    const res = await GET(req, { params: { nodeId: 'node-1' } })
    expect(res.status).toBe(401)
  })

  it('should validate POST body', async () => {
    const { POST } = await import('@/app/api/v1/threads/[nodeId]/route')
    const req = new Request('http://localhost:3000/api/v1/threads/node-1', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, { params: { nodeId: 'node-1' } })
    expect(res.status).toBe(400)
  })
})

// ============================================================
// AI Analyze
// ============================================================
describe('API Routes - AI Analyze', () => {
  it('should reject unauthenticated POST', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/ai/analyze/route')
    const req = new Request('http://localhost:3000/api/v1/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ action: 'summarize', context: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should reject invalid action', async () => {
    const { POST } = await import('@/app/api/v1/ai/analyze/route')
    const req = new Request('http://localhost:3000/api/v1/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid_action', context: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ============================================================
// Billing - Checkout
// ============================================================
describe('API Routes - Billing Checkout', () => {
  it('should reject unauthenticated POST', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/billing/checkout/route')
    const req = new Request('http://localhost:3000/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro', workspaceId: '00000000-0000-0000-0000-000000000000' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should validate request body', async () => {
    const { POST } = await import('@/app/api/v1/billing/checkout/route')
    const req = new Request('http://localhost:3000/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
  })

  it('should reject malformed JSON', async () => {
    const { POST } = await import('@/app/api/v1/billing/checkout/route')
    const req = new Request('http://localhost:3000/api/v1/billing/checkout', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_JSON')
  })
})

// ============================================================
// Billing - Portal
// ============================================================
describe('API Routes - Billing Portal', () => {
  it('should reject unauthenticated POST', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/billing/portal/route')
    const req = new Request('http://localhost:3000/api/v1/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000000' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should validate request body', async () => {
    const { POST } = await import('@/app/api/v1/billing/portal/route')
    const req = new Request('http://localhost:3000/api/v1/billing/portal', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ============================================================
// Templates Install
// ============================================================
describe('API Routes - Template Install', () => {
  it('should reject unauthenticated POST', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/templates/[id]/install/route')
    const req = new Request('http://localhost:3000/api/v1/templates/tmpl-1/install', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000000' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, { params: { id: 'tmpl-1' } })
    expect(res.status).toBe(401)
  })

  it('should require workspaceId', async () => {
    const { POST } = await import('@/app/api/v1/templates/[id]/install/route')
    const req = new Request('http://localhost:3000/api/v1/templates/tmpl-1/install', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req, { params: { id: 'tmpl-1' } })
    expect(res.status).toBe(400)
  })
})
