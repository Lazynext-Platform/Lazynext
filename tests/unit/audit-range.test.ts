import { describe, it, expect } from 'vitest'
import {
  parseAuditRange,
  rangeCutoffIso,
  formatAuditRange,
  type AuditRange,
} from '@/lib/utils/audit-format'

describe('parseAuditRange', () => {
  it('returns "all" for missing input (preserves today\'s no-filter default)', () => {
    expect(parseAuditRange(undefined)).toBe('all')
    expect(parseAuditRange(null)).toBe('all')
    expect(parseAuditRange('')).toBe('all')
  })

  it('passes valid buckets through', () => {
    for (const r of ['7', '30', '90', '365', 'all'] as AuditRange[]) {
      expect(parseAuditRange(r)).toBe(r)
    }
  })

  it('collapses garbage / unsupported buckets to "all" (URLs never 400)', () => {
    expect(parseAuditRange('1y')).toBe('all')
    expect(parseAuditRange('-1')).toBe('all')
    expect(parseAuditRange('14')).toBe('all')
    expect(parseAuditRange('forever')).toBe('all')
    expect(parseAuditRange('All')).toBe('all') // case-sensitive on purpose
  })
})

describe('rangeCutoffIso', () => {
  const now = new Date('2026-05-06T12:00:00.000Z')

  it('returns null for "all"', () => {
    expect(rangeCutoffIso('all', now)).toBeNull()
  })

  it('subtracts the right number of days', () => {
    expect(rangeCutoffIso('7', now)).toBe('2026-04-29T12:00:00.000Z')
    expect(rangeCutoffIso('30', now)).toBe('2026-04-06T12:00:00.000Z')
    expect(rangeCutoffIso('90', now)).toBe('2026-02-05T12:00:00.000Z')
    expect(rangeCutoffIso('365', now)).toBe('2025-05-06T12:00:00.000Z')
  })

  it('returns ISO 8601 strings (so .gte() can compare lexically)', () => {
    const cutoff = rangeCutoffIso('7', now)
    expect(cutoff).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('formatAuditRange', () => {
  it('produces a human label for every bucket', () => {
    expect(formatAuditRange('7')).toBe('Last 7 days')
    expect(formatAuditRange('30')).toBe('Last 30 days')
    expect(formatAuditRange('90')).toBe('Last 90 days')
    expect(formatAuditRange('365')).toBe('Last year')
    expect(formatAuditRange('all')).toBe('All time')
  })
})
