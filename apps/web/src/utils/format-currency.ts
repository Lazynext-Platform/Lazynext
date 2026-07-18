/**
 * Currency formatting utility using the native Intl.NumberFormat API.
 *
 * This provides locale-aware currency formatting for all ISO 4217
 * currencies and all BCP 47 locales. No hardcoded data needed —
 * the browser/runtime already has comprehensive ICU data.
 *
 * @module utils/format-currency
 */

/**
 * Format a monetary amount in a given currency and locale.
 *
 * @param amount - The amount in major units (e.g. 12.99, not 1299)
 * @param currency - ISO 4217 currency code (e.g. "USD", "EUR", "INR")
 * @param locale - BCP 47 locale tag (e.g. "en-US", "fr-FR", "de-DE")
 * @returns Formatted currency string like "$12.99" or "12,99 €"
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(amount);
  } catch {
    // Fallback for unsupported currency/locale combinations
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a monetary amount in minor units (cents) to a display string.
 *
 * @param amountMinor - Amount in minor units (e.g. 1299 for $12.99)
 * @param currency - ISO 4217 currency code
 * @param locale - BCP 47 locale tag
 * @param decimals - Number of decimal places (2 for USD, 0 for JPY)
 */
export function formatCurrencyMinor(
  amountMinor: number,
  currency: string,
  locale: string,
  decimals: number = 2,
): string {
  return formatCurrency(amountMinor / Math.pow(10, decimals), currency, locale);
}

/**
 * Get a list of all common ISO 4217 currency codes supported by Intl.
 */
export function getCommonCurrencies(): string[] {
  return [
    "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY",
    "INR", "BRL", "MXN", "KRW", "RUB", "ZAR", "TRY", "SGD",
    "NZD", "HKD", "SEK", "NOK", "DKK", "PLN", "THB", "IDR",
    "MYR", "PHP", "VND", "AED", "SAR", "QAR", "EGP", "NGN",
    "KES", "ARS", "CLP", "COP", "PEN", "UYU", "PKR", "BDT",
    "LKR", "NPR", "ILS", "KWD", "BHD", "OMR", "MAD", "TND",
    "DZD", "GHS", "UGX", "TZS", "ETB", "RWF", "XOF", "XAF",
  ];
}
