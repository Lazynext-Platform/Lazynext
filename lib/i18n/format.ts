import type { Currency } from './config'

/**
 * Format a monetary amount in any currency for any locale.
 * Uses the browser's Intl.NumberFormat which supports ALL ISO 4217 currencies
 * and ALL CLDR locales natively.
 *
 * @param amount - The numeric amount
 * @param currency - ISO 4217 currency code (e.g. 'USD', 'EUR', 'JPY', 'INR')
 * @param locale - BCP 47 locale string (e.g. 'en-US', 'ja-JP', 'de-DE')
 */
export function formatCurrency(
  amount: number,
  currency: Currency | string = 'USD',
  locale?: string
): string {
  return new Intl.NumberFormat(locale ?? undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

/**
 * Format a number according to locale conventions.
 */
export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? undefined).format(value)
}

/**
 * Format a date according to locale conventions.
 */
export function formatLocalDate(
  date: Date | string,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale ?? undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

/**
 * Format a date with time according to locale conventions.
 */
export function formatLocalDateTime(
  date: Date | string,
  locale?: string
): string {
  return new Intl.DateTimeFormat(locale ?? undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(date))
}

/**
 * Format a relative time (e.g., "3 hours ago", "in 2 days").
 */
export function formatRelativeTime(date: Date | string, locale?: string): string {
  const now = Date.now()
  const target = new Date(date).getTime()
  const diffMs = target - now
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(locale ?? undefined, { numeric: 'auto' })

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')
  if (Math.abs(diffDay) < 365) return rtf.format(Math.round(diffDay / 30), 'month')
  return rtf.format(Math.round(diffDay / 365), 'year')
}

/**
 * Get the currency symbol for a currency code.
 */
export function getCurrencySymbol(currency: Currency | string, locale?: string): string {
  return new Intl.NumberFormat(locale ?? undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency
}

/**
 * Convert USD price to approximate local currency using static rates.
 * For production, use a live exchange rate API.
 * These are approximate rates for display purposes only — actual billing
 * is handled by Lemon Squeezy which uses live exchange rates.
 */
const APPROXIMATE_USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149, CNY: 7.24, INR: 83.5,
  BRL: 4.97, KRW: 1320, AUD: 1.53, CAD: 1.36, CHF: 0.88, MXN: 17.1,
  SGD: 1.34, HKD: 7.82, NOK: 10.6, SEK: 10.4, DKK: 6.87, NZD: 1.64,
  ZAR: 18.6, TRY: 30.2, PLN: 4.03, THB: 35.1, IDR: 15600, MYR: 4.72,
  PHP: 55.8, CZK: 22.8, ILS: 3.64, CLP: 912, ARS: 350, COP: 3930,
  PEN: 3.73, UAH: 37.4, RON: 4.57, HUF: 355, VND: 24400, EGP: 30.9,
  NGN: 1520, KES: 154, GHS: 12.4, TWD: 31.5, SAR: 3.75, AED: 3.67,
  QAR: 3.64, KWD: 0.31, BHD: 0.38, OMR: 0.38, JOD: 0.71, PKR: 278,
  BDT: 110, LKR: 325, RUB: 91.5, BGN: 1.80, HRK: 6.93, ISK: 138,
}

export function convertFromUSD(amountUSD: number, targetCurrency: Currency | string): number {
  const rate = APPROXIMATE_USD_RATES[targetCurrency] ?? 1
  return Math.round(amountUSD * rate * 100) / 100
}

/**
 * Format a price in the user's preferred currency, converting from USD base.
 */
export function formatPrice(
  amountUSD: number,
  currency: Currency | string = 'USD',
  locale?: string
): string {
  const converted = convertFromUSD(amountUSD, currency)
  return formatCurrency(converted, currency, locale)
}
