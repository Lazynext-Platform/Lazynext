import { describe, it, expect } from 'vitest'
import { canAddMember, canCreateWorkflow, canCreateNode, canUseAI, hasFeature } from '@/lib/utils/plan-gates'

describe('Plan Gates', () => {
  it('should enforce free plan member limit', () => {
    expect(canAddMember('free', 2)).toBe(true)
    expect(canAddMember('free', 3)).toBe(false)
  })

  it('should enforce workflow limits', () => {
    expect(canCreateWorkflow('free', 4)).toBe(true)
    expect(canCreateWorkflow('free', 5)).toBe(false)
    expect(canCreateWorkflow('business', 9999)).toBe(true)  // unlimited
  })

  it('should enforce node limits', () => {
    expect(canCreateNode('free', 99)).toBe(true)
    expect(canCreateNode('free', 100)).toBe(false)
    expect(canCreateNode('pro', 9999)).toBe(true)
  })

  it('should enforce AI query limits', () => {
    expect(canUseAI('free', 19)).toBe(true)
    expect(canUseAI('free', 20)).toBe(false)
    expect(canUseAI('business', 99999)).toBe(true)  // unlimited
  })

  it('should gate features by plan', () => {
    expect(hasFeature('free', 'decision-health')).toBe(false)
    expect(hasFeature('business', 'decision-health')).toBe(true)
    expect(hasFeature('pro', 'weekly-digest')).toBe(true)
    expect(hasFeature('free', 'weekly-digest')).toBe(false)
  })
})
