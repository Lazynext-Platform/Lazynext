import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackBillingEvent } from '@/lib/utils/telemetry'

describe('trackBillingEvent', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('emits a single JSON line with the BILLING_EVENT marker', () => {
    trackBillingEvent('paywall.modal.opened', { variant: 'health-gate' })

    expect(logSpy).toHaveBeenCalledTimes(1)
    const line = logSpy.mock.calls[0]![0] as string
    const payload = JSON.parse(line)

    expect(payload.type).toBe('BILLING_EVENT')
    expect(payload.event).toBe('paywall.modal.opened')
    expect(payload.variant).toBe('health-gate')
    expect(typeof payload.ts).toBe('string')
    // ISO 8601 timestamp shape
    expect(payload.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('includes props flat at the top level (not nested under .props)', () => {
    trackBillingEvent('webhook.sale.applied', {
      workspaceId: 'ws-42',
      plan: 'pro',
      subscriptionId: 'sub_abc',
    })
    const payload = JSON.parse(logSpy.mock.calls[0]![0] as string)
    expect(payload.workspaceId).toBe('ws-42')
    expect(payload.plan).toBe('pro')
    expect(payload.subscriptionId).toBe('sub_abc')
    // No nested props key — log aggregators filter on top-level fields
    expect(payload.props).toBeUndefined()
  })

  it('never throws — telemetry is best-effort', () => {
    // Circular prop would break JSON.stringify; ensure the helper swallows it.
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() =>
      trackBillingEvent('webhook.ping.received', circular as Record<string, string>)
    ).not.toThrow()
  })

  it('emits no log line when JSON.stringify fails', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    trackBillingEvent('webhook.ping.received', circular as Record<string, string>)
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('dedupes identical paywall events within the 10s window', () => {
    // Unique variant so it doesn't collide with state from other tests.
    trackBillingEvent('paywall.gate.shown', { variant: 'dedupe-test-1', plan: 'free' })
    trackBillingEvent('paywall.gate.shown', { variant: 'dedupe-test-1', plan: 'free' })
    trackBillingEvent('paywall.gate.shown', { variant: 'dedupe-test-1', plan: 'free' })
    expect(logSpy).toHaveBeenCalledTimes(1)
  })

  it('never dedupes webhook events (every ping matters)', () => {
    trackBillingEvent('webhook.sale.applied', { workspaceId: 'ws-x' })
    trackBillingEvent('webhook.sale.applied', { workspaceId: 'ws-x' })
    trackBillingEvent('webhook.sale.applied', { workspaceId: 'ws-x' })
    expect(logSpy).toHaveBeenCalledTimes(3)
  })
})
