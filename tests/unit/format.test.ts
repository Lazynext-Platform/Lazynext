import { describe, it, expect } from 'vitest'
import { timeAgo, formatDate, formatCurrencyINR, qualityLabel } from '@/lib/utils/format'

describe('Format Utilities', () => {
  it('timeAgo should handle recent dates', () => {
    const now = new Date()
    const result = timeAgo(now)
    expect(result).toMatch(/just now|seconds? ago|less than a minute ago/)
  })

  it('formatDate should return formatted date string', () => {
    const date = new Date('2026-04-05')
    const result = formatDate(date)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('formatCurrencyINR should format correctly', () => {
    expect(formatCurrencyINR(999)).toContain('999')
  })

  it('qualityLabel should categorize scores', () => {
    expect(qualityLabel(80)).toBe('high')
    expect(qualityLabel(50)).toBe('medium')
    expect(qualityLabel(20)).toBe('low')
  })
})
