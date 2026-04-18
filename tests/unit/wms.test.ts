import { describe, it, expect } from 'vitest'
import { layerForScore, isFeatureUnlocked, WMS_THRESHOLDS } from '@/lib/wms'

// Workspace Maturity Score drives progressive feature exposure in the sidebar.
// If these thresholds shift, users will see features appear/disappear at the
// wrong time. Lock the behavior with tests.
describe('WMS — layerForScore', () => {
  it('returns L1 for fresh workspaces at 0', () => {
    expect(layerForScore(0)).toBe(1)
  })

  it('returns L1 just below activation', () => {
    expect(layerForScore(WMS_THRESHOLDS.L2_ACTIVATION - 1)).toBe(1)
  })

  it('returns L2 exactly at activation threshold', () => {
    expect(layerForScore(WMS_THRESHOLDS.L2_ACTIVATION)).toBe(2)
  })

  it('returns L3 at expansion threshold', () => {
    expect(layerForScore(WMS_THRESHOLDS.L3_EXPANSION)).toBe(3)
  })

  it('returns L4 at power threshold', () => {
    expect(layerForScore(WMS_THRESHOLDS.L4_POWER)).toBe(4)
  })

  it('caps at L4 for scores above power threshold', () => {
    expect(layerForScore(999)).toBe(4)
  })
})

describe('WMS — isFeatureUnlocked', () => {
  it('tasks + threads unlock at L2 (15 points)', () => {
    expect(isFeatureUnlocked('tasks', 14)).toBe(false)
    expect(isFeatureUnlocked('tasks', 15)).toBe(true)
    expect(isFeatureUnlocked('threads', 15)).toBe(true)
  })

  it('docs + tables unlock at L3 (35 points)', () => {
    expect(isFeatureUnlocked('docs', 34)).toBe(false)
    expect(isFeatureUnlocked('docs', 35)).toBe(true)
    expect(isFeatureUnlocked('tables', 35)).toBe(true)
  })

  it('canvas + automations unlock at L4 (60 points)', () => {
    expect(isFeatureUnlocked('canvas', 59)).toBe(false)
    expect(isFeatureUnlocked('canvas', 60)).toBe(true)
    expect(isFeatureUnlocked('automations', 60)).toBe(true)
    expect(isFeatureUnlocked('integrations', 60)).toBe(true)
  })

  it('powerUserOverride short-circuits to unlocked for every feature', () => {
    expect(isFeatureUnlocked('canvas', 0, true)).toBe(true)
    expect(isFeatureUnlocked('automations', 0, true)).toBe(true)
    expect(isFeatureUnlocked('tasks', 0, true)).toBe(true)
  })

  it('lower score still locks without override', () => {
    expect(isFeatureUnlocked('canvas', 0, false)).toBe(false)
  })
})
