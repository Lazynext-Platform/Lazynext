import { describe, it, expect } from 'vitest'
import { PLANS, buildCheckoutUrl } from '@/lib/billing/plans'

describe('Billing Plans', () => {
  it('defines all plan tiers', () => {
    expect(PLANS).toHaveProperty('free')
    expect(PLANS).toHaveProperty('starter')
    expect(PLANS).toHaveProperty('pro')
    expect(PLANS).toHaveProperty('business')
  })

  it('free plan has null monthly/yearly (no checkout)', () => {
    expect(PLANS.free.monthly).toBeNull()
    expect(PLANS.free.yearly).toBeNull()
  })

  it('paid plans have monthly and yearly keys', () => {
    for (const plan of ['starter', 'pro', 'business'] as const) {
      expect(PLANS[plan]).toHaveProperty('monthly')
      expect(PLANS[plan]).toHaveProperty('yearly')
    }
  })

  it('plan names are correct', () => {
    expect(PLANS.free.name).toBe('Free')
    expect(PLANS.starter.name).toBe('Starter')
    expect(PLANS.pro.name).toBe('Pro')
    expect(PLANS.business.name).toBe('Business')
  })

  it('buildCheckoutUrl appends workspace context as url params', () => {
    const url = buildCheckoutUrl('https://x.gumroad.com/l/pro-monthly', {
      workspaceId: 'ws-123',
      userId: 'user-456',
      plan: 'pro',
      interval: 'monthly',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('wanted')).toBe('true')
    expect(parsed.searchParams.get('workspace_id')).toBe('ws-123')
    expect(parsed.searchParams.get('user_id')).toBe('user-456')
    expect(parsed.searchParams.get('plan')).toBe('pro')
    expect(parsed.searchParams.get('interval')).toBe('monthly')
  })
})

