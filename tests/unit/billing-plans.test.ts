import { describe, it, expect } from 'vitest'
import { PLANS } from '@/lib/billing/plans'

describe('Billing Plans', () => {
  it('defines all plan tiers', () => {
    expect(PLANS).toHaveProperty('free')
    expect(PLANS).toHaveProperty('starter')
    expect(PLANS).toHaveProperty('pro')
    expect(PLANS).toHaveProperty('business')
  })

  it('free plan has no variantId', () => {
    expect(PLANS.free.variantId).toBeNull()
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
})
