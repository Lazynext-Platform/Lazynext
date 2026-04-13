import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatLocalDate,
  getCurrencySymbol,
  convertFromUSD,
  formatPrice,
} from '@/lib/i18n/format'

describe('i18n Format Utilities', () => {
  describe('formatCurrency', () => {
    it('formats USD by default', () => {
      const result = formatCurrency(29, 'USD', 'en-US')
      expect(result).toContain('29')
      expect(result).toMatch(/\$/)
    })

    it('formats EUR in German locale', () => {
      const result = formatCurrency(49, 'EUR', 'de-DE')
      expect(result).toContain('49')
      expect(result).toMatch(/€/)
    })

    it('formats JPY without decimals', () => {
      const result = formatCurrency(4999, 'JPY', 'ja-JP')
      expect(result).toContain('4,999')
    })

    it('formats INR', () => {
      const result = formatCurrency(999, 'INR', 'en-IN')
      expect(result).toContain('999')
      expect(result).toMatch(/₹/)
    })

    it('omits decimals for whole numbers', () => {
      const result = formatCurrency(10, 'USD', 'en-US')
      expect(result).not.toContain('.')
    })

    it('includes decimals for fractional amounts', () => {
      const result = formatCurrency(9.99, 'USD', 'en-US')
      expect(result).toContain('9.99')
    })
  })

  describe('formatNumber', () => {
    it('formats numbers with locale grouping', () => {
      const result = formatNumber(1000000, 'en-US')
      expect(result).toContain('1,000,000')
    })
  })

  describe('formatLocalDate', () => {
    it('formats a date string', () => {
      const result = formatLocalDate('2025-06-15', 'en-US')
      expect(result).toContain('Jun')
      expect(result).toContain('15')
      expect(result).toContain('2025')
    })

    it('formats a Date object', () => {
      const result = formatLocalDate(new Date('2025-01-01'), 'en-US')
      expect(result).toBeTruthy()
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      const symbol = getCurrencySymbol('USD', 'en-US')
      expect(symbol).toBe('$')
    })

    it('returns € for EUR', () => {
      const symbol = getCurrencySymbol('EUR', 'en-US')
      expect(symbol).toBe('€')
    })

    it('returns ₹ for INR', () => {
      const symbol = getCurrencySymbol('INR', 'en-IN')
      expect(symbol).toBe('₹')
    })
  })

  describe('convertFromUSD', () => {
    it('returns same amount for USD', () => {
      expect(convertFromUSD(10, 'USD')).toBe(10)
    })

    it('converts to EUR using approximate rate', () => {
      const result = convertFromUSD(100, 'EUR')
      expect(result).toBeGreaterThan(80)
      expect(result).toBeLessThan(100)
    })

    it('converts to JPY using approximate rate', () => {
      const result = convertFromUSD(10, 'JPY')
      expect(result).toBeGreaterThan(1000)
    })

    it('falls back to 1:1 for unknown currencies', () => {
      expect(convertFromUSD(10, 'XYZ')).toBe(10)
    })
  })

  describe('formatPrice', () => {
    it('formats USD price without conversion', () => {
      const result = formatPrice(29, 'USD', 'en-US')
      expect(result).toContain('29')
      expect(result).toMatch(/\$/)
    })

    it('formats converted INR price', () => {
      const result = formatPrice(10, 'INR', 'en-IN')
      expect(result).toMatch(/₹/)
      // 10 USD * ~83.5 = ~835 INR
      expect(result).toContain('835')
    })
  })
})
