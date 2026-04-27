import { describe, it, expect, vi, beforeEach } from 'vitest'

// Both upstream auth helpers must be mocked. The route-auth helper is
// pure plumbing on top of them.
const mockApiKey = vi.fn()
const mockSafeAuth = vi.fn()
const mockVerifyMember = vi.fn()

vi.mock('@/lib/utils/api-key-auth', () => ({
  authenticateApiKey: (...args: unknown[]) => mockApiKey(...args),
}))
vi.mock('@/lib/utils/auth', () => ({
  safeAuth: (...args: unknown[]) => mockSafeAuth(...args),
  verifyWorkspaceMember: (...args: unknown[]) => mockVerifyMember(...args),
}))

import { resolveAuth, requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'

beforeEach(() => {
  mockApiKey.mockReset()
  mockSafeAuth.mockReset()
  mockVerifyMember.mockReset()
})

const req = new Request('http://example.test/v1/x')

describe('resolveAuth', () => {
  it('returns viaApiKey=true when bearer resolves', async () => {
    mockApiKey.mockResolvedValue({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read'] })
    const out = await resolveAuth(req)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.viaApiKey).toBe(true)
      expect(out.userId).toBe('u1')
      expect(out.bearerWorkspaceId).toBe('w1')
      expect(out.keyId).toBe('k1')
      expect(out.scopes).toEqual(['read'])
    }
    expect(mockSafeAuth).not.toHaveBeenCalled()
  })

  it('falls back to cookie session when no bearer', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: 'u9' })
    const out = await resolveAuth(req)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.viaApiKey).toBe(false)
      expect(out.userId).toBe('u9')
      expect(out.bearerWorkspaceId).toBeNull()
      // Cookie sessions get the full scope set.
      expect(out.scopes).toEqual(['read', 'write'])
    }
  })

  it('returns 401 when neither bearer nor session resolves', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: null })
    const out = await resolveAuth(req)
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.response.status).toBe(401)
    }
  })

  it('rate-limit id is keyed by keyId for bearer requests', async () => {
    mockApiKey.mockResolvedValue({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read'] })
    const out = await resolveAuth(req)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.rateLimitId).toBe('key:k1')
  })

  it('rate-limit id is keyed by userId for cookie sessions', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: 'u9' })
    const out = await resolveAuth(req)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.rateLimitId).toBe('user:u9')
  })
})

describe('requireWorkspaceAuth', () => {
  it('passes when bearer key matches the requested workspace', async () => {
    mockApiKey.mockResolvedValue({ workspaceId: 'w1', userId: 'u1', keyId: 'k1', scopes: ['read'] })
    const out = await requireWorkspaceAuth(req, 'w1')
    expect(out.ok).toBe(true)
    expect(mockVerifyMember).not.toHaveBeenCalled()
  })

  it('rejects with 403 WORKSPACE_MISMATCH when bearer key targets another workspace', async () => {
    mockApiKey.mockResolvedValue({ workspaceId: 'w2', userId: 'u1', keyId: 'k1', scopes: ['read'] })
    const out = await requireWorkspaceAuth(req, 'w1')
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.response.status).toBe(403)
      const body = await out.response.json()
      expect(body.error).toBe('WORKSPACE_MISMATCH')
    }
  })

  it('passes when cookie session user is a workspace member', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: 'u9' })
    mockVerifyMember.mockResolvedValue(true)
    const out = await requireWorkspaceAuth(req, 'w1')
    expect(out.ok).toBe(true)
    expect(mockVerifyMember).toHaveBeenCalledWith('u9', 'w1')
  })

  it('returns 403 FORBIDDEN when cookie session user is not a member', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: 'u9' })
    mockVerifyMember.mockResolvedValue(false)
    const out = await requireWorkspaceAuth(req, 'w1')
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.response.status).toBe(403)
      const body = await out.response.json()
      expect(body.error).toBe('FORBIDDEN')
    }
  })

  it('returns 401 when no caller is present at all', async () => {
    mockApiKey.mockResolvedValue(null)
    mockSafeAuth.mockResolvedValue({ userId: null })
    const out = await requireWorkspaceAuth(req, 'w1')
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.response.status).toBe(401)
    }
  })
})

describe('requireScope', () => {
  it('passes when the auth carries the required scope', () => {
    const fail = requireScope(
      { ok: true, userId: 'u1', bearerWorkspaceId: 'w1', viaApiKey: true, keyId: 'k1', rateLimitId: 'key:k1', scopes: ['read', 'write'] },
      'write',
    )
    expect(fail).toBeNull()
  })

  it('rejects with 403 INSUFFICIENT_SCOPE when the scope is missing', async () => {
    const fail = requireScope(
      { ok: true, userId: 'u1', bearerWorkspaceId: 'w1', viaApiKey: true, keyId: 'k1', rateLimitId: 'key:k1', scopes: ['read'] },
      'write',
    )
    expect(fail).not.toBeNull()
    if (fail) {
      expect(fail.response.status).toBe(403)
      const body = await fail.response.json()
      expect(body.error).toBe('INSUFFICIENT_SCOPE')
      expect(body.requiredScope).toBe('write')
    }
  })
})
