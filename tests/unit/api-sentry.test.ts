import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @sentry/nextjs BEFORE importing the module under test.
// We need to assert that withScope + setTag + setExtra + captureException
// are wired correctly.
const captureException = vi.fn()
const setTag = vi.fn()
const setExtra = vi.fn()
const withScope = vi.fn((cb: (scope: { setTag: typeof setTag; setExtra: typeof setExtra }) => void) => {
  cb({ setTag, setExtra })
})

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  withScope: (cb: (scope: { setTag: typeof setTag; setExtra: typeof setExtra }) => void) => withScope(cb),
}))

import { reportApiError } from '@/lib/utils/api-sentry'

describe('reportApiError', () => {
  beforeEach(() => {
    captureException.mockClear()
    setTag.mockClear()
    setExtra.mockClear()
    withScope.mockClear()
  })

  it('forwards the error to Sentry.captureException', () => {
    const err = new Error('boom')
    reportApiError(err, { route: '/api/v1/whoami', method: 'GET' })
    expect(captureException).toHaveBeenCalledTimes(1)
    expect(captureException).toHaveBeenCalledWith(err)
  })

  it('tags surface, route, and method on every call', () => {
    reportApiError(new Error('x'), { route: '/api/v1/workflows/[id]', method: 'PATCH' })
    expect(setTag).toHaveBeenCalledWith('surface', 'api/v1')
    expect(setTag).toHaveBeenCalledWith('route', '/api/v1/workflows/[id]')
    expect(setTag).toHaveBeenCalledWith('method', 'PATCH')
  })

  it('tags request_id, workspace_id, and user_id when provided', () => {
    reportApiError(new Error('x'), {
      route: '/api/v1/whoami',
      method: 'GET',
      requestId: 'req-123',
      workspaceId: 'ws-456',
      userId: 'user-789',
    })
    expect(setTag).toHaveBeenCalledWith('request_id', 'req-123')
    expect(setTag).toHaveBeenCalledWith('workspace_id', 'ws-456')
    expect(setTag).toHaveBeenCalledWith('user_id', 'user-789')
  })

  it('does not tag optional ids when null/undefined', () => {
    reportApiError(new Error('x'), {
      route: '/api/v1/whoami',
      method: 'GET',
      requestId: null,
      workspaceId: null,
      userId: null,
    })
    const tagKeys = setTag.mock.calls.map((c) => c[0])
    expect(tagKeys).not.toContain('request_id')
    expect(tagKeys).not.toContain('workspace_id')
    expect(tagKeys).not.toContain('user_id')
  })

  it('forwards arbitrary extras to setExtra', () => {
    reportApiError(new Error('x'), {
      route: '/api/v1/billing/checkout',
      method: 'POST',
      extra: { plan: 'pro', interval: 'yearly' },
    })
    expect(setExtra).toHaveBeenCalledWith('plan', 'pro')
    expect(setExtra).toHaveBeenCalledWith('interval', 'yearly')
  })

  it('never throws even if Sentry itself blows up', () => {
    withScope.mockImplementationOnce(() => {
      throw new Error('sentry exploded')
    })
    expect(() => reportApiError(new Error('x'), { route: '/api/v1/whoami', method: 'GET' })).not.toThrow()
  })

  it('writes to console.error in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      reportApiError(new Error('boom'), { route: '/api/v1/whoami', method: 'GET' })
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('does NOT write to console.error in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      reportApiError(new Error('boom'), { route: '/api/v1/whoami', method: 'GET' })
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
      vi.unstubAllEnvs()
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
