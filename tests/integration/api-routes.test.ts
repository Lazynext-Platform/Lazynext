import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB client
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: 'test-ws-id',
            name: 'Test Workspace',
            slug: 'test-ws',
            plan: 'free',
            lsCustomerId: null,
          }])),
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
        onConflictDoNothing: vi.fn(() => Promise.resolve()),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
  hasValidDatabaseUrl: true,
}))

// Mock auth
vi.mock('@/lib/utils/auth', () => ({
  safeAuth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
  verifyWorkspaceMember: vi.fn(() => Promise.resolve(true)),
}))

// Mock AI
vi.mock('@/lib/ai/lazymind', () => ({
  callLazyMind: vi.fn(() => Promise.resolve({ content: 'AI response', provider: 'groq' })),
}))

vi.mock('@/lib/ai/decision-quality', () => ({
  computeDecisionQualityScore: vi.fn(() => 75),
}))

describe('API Routes - Nodes', () => {
  it('should reject unauthenticated requests', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/nodes/route')
    const req = new Request('http://localhost:3000/api/v1/nodes?workflowId=test-wf')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('should validate POST body with Zod', async () => {
    const { POST } = await import('@/app/api/v1/nodes/route')
    const req = new Request('http://localhost:3000/api/v1/nodes', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
  })
})

describe('API Routes - Decisions', () => {
  it('should reject unauthenticated requests', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { GET } = await import('@/app/api/v1/decisions/route')
    const req = new Request('http://localhost:3000/api/v1/decisions?workspaceId=test-ws')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('API Routes - AI Generate', () => {
  it('should reject unauthenticated requests', async () => {
    const { safeAuth } = await import('@/lib/utils/auth')
    vi.mocked(safeAuth).mockResolvedValueOnce({ userId: null })

    const { POST } = await import('@/app/api/v1/ai/generate/route')
    const req = new Request('http://localhost:3000/api/v1/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', type: 'node_content' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should validate request body', async () => {
    const { POST } = await import('@/app/api/v1/ai/generate/route')
    const req = new Request('http://localhost:3000/api/v1/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('API Routes - Import', () => {
  it('should validate import source', async () => {
    const { POST } = await import('@/app/api/v1/import/route')
    const req = new Request('http://localhost:3000/api/v1/import', {
      method: 'POST',
      body: JSON.stringify({ source: 'invalid-source', workspaceId: '00000000-0000-0000-0000-000000000000' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('API Routes - Search', () => {
  it('should require query and workspaceId', async () => {
    const { GET } = await import('@/app/api/v1/search/route')
    const req = new Request('http://localhost:3000/api/v1/search')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
