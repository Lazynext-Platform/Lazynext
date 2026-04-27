import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, PLAN_PRICING_USD, PLAN_PRICING_USD_ANNUAL } from '@/lib/utils/constants'
import {
  canAddMember,
  canCreateNode,
  canCreateWorkflow,
  canUseAI,
  canCreateDecision,
  canCreateWorkspace,
} from '@/lib/utils/plan-gates'

describe('PLAN_LIMITS shape', () => {
  it('every plan has every limit field', () => {
    const expected = ['members', 'workflows', 'nodes', 'aiQueries', 'decisions', 'workspaces']
    for (const plan of Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>) {
      for (const k of expected) {
        expect(PLAN_LIMITS[plan]).toHaveProperty(k)
      }
    }
  })

  it('Free is the only capped tier across structure (members/workspaces/decisions)', () => {
    expect(PLAN_LIMITS.free.members).toBe(3)
    expect(PLAN_LIMITS.free.workspaces).toBe(1)
    expect(PLAN_LIMITS.free.decisions).toBe(20)
    expect(PLAN_LIMITS.free.nodes).toBe(100)
    expect(PLAN_LIMITS.free.workflows).toBe(5)
    expect(PLAN_LIMITS.free.aiQueries).toBe(20)

    for (const plan of ['starter', 'pro', 'business', 'enterprise'] as const) {
      expect(PLAN_LIMITS[plan].members).toBe(-1)
      expect(PLAN_LIMITS[plan].workspaces).toBe(-1)
      expect(PLAN_LIMITS[plan].decisions).toBe(-1)
      expect(PLAN_LIMITS[plan].nodes).toBe(-1)
      expect(PLAN_LIMITS[plan].workflows).toBe(-1)
    }
  })

  it('AI queries scale up tier-by-tier on paid plans', () => {
    expect(PLAN_LIMITS.starter.aiQueries).toBe(100)
    expect(PLAN_LIMITS.pro.aiQueries).toBe(500)
    expect(PLAN_LIMITS.business.aiQueries).toBe(-1)
    expect(PLAN_LIMITS.enterprise.aiQueries).toBe(-1)
  })

  it('annual pricing is exactly 20% off (rounded) on paid tiers', () => {
    // $19 × 0.8 = $15.20 → $15. $30 × 0.8 = $24. Both already in
    // constants — guard against accidental drift.
    expect(PLAN_PRICING_USD.starter).toBe(19)
    expect(PLAN_PRICING_USD_ANNUAL.starter).toBe(15)
    expect(PLAN_PRICING_USD.pro).toBe(30)
    expect(PLAN_PRICING_USD_ANNUAL.pro).toBe(24)
  })
})

describe('plan gate functions', () => {
  describe('canCreateDecision', () => {
    it('caps Free at 20', () => {
      expect(canCreateDecision('free', 0)).toBe(true)
      expect(canCreateDecision('free', 19)).toBe(true)
      expect(canCreateDecision('free', 20)).toBe(false)
      expect(canCreateDecision('free', 9999)).toBe(false)
    })
    it('uncapped on every paid tier', () => {
      for (const plan of ['starter', 'pro', 'business', 'enterprise'] as const) {
        expect(canCreateDecision(plan, 9999)).toBe(true)
      }
    })
  })

  describe('canCreateWorkspace', () => {
    it('caps Free at 1', () => {
      expect(canCreateWorkspace('free', 0)).toBe(true)
      expect(canCreateWorkspace('free', 1)).toBe(false)
    })
    it('uncapped on paid tiers', () => {
      expect(canCreateWorkspace('starter', 99)).toBe(true)
      expect(canCreateWorkspace('business', 99)).toBe(true)
    })
  })

  describe('existing gates still work', () => {
    it('canAddMember', () => {
      expect(canAddMember('free', 2)).toBe(true)
      expect(canAddMember('free', 3)).toBe(false)
      expect(canAddMember('starter', 9999)).toBe(true)
    })
    it('canCreateNode', () => {
      expect(canCreateNode('free', 99)).toBe(true)
      expect(canCreateNode('free', 100)).toBe(false)
      expect(canCreateNode('pro', 9999)).toBe(true)
    })
    it('canCreateWorkflow', () => {
      expect(canCreateWorkflow('free', 4)).toBe(true)
      expect(canCreateWorkflow('free', 5)).toBe(false)
      expect(canCreateWorkflow('starter', 9999)).toBe(true)
    })
    it('canUseAI', () => {
      expect(canUseAI('free', 19)).toBe(true)
      expect(canUseAI('free', 20)).toBe(false)
      expect(canUseAI('starter', 99)).toBe(true)
      expect(canUseAI('starter', 100)).toBe(false)
      expect(canUseAI('business', 9999)).toBe(true)
    })
  })
})
