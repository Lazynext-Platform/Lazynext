// Supported locales — add new languages by creating messages/{locale}.json
export const locales = [
  'en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi',
  'it', 'nl', 'ru', 'tr', 'pl', 'sv', 'da', 'fi', 'nb', 'uk',
  'th', 'vi', 'id', 'ms', 'tl', 'cs', 'ro', 'hu', 'el', 'he',
  'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'sw',
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

// All ISO 4217 currency codes supported via Intl.NumberFormat
export const currencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'BRL', 'KRW', 'AUD', 'CAD',
  'CHF', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'TRY',
  'PLN', 'THB', 'IDR', 'MYR', 'PHP', 'CZK', 'ILS', 'CLP', 'ARS', 'COP',
  'PEN', 'UAH', 'RON', 'HUF', 'VND', 'EGP', 'NGN', 'KES', 'GHS', 'TWD',
  'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'PKR', 'BDT', 'LKR',
  'MMK', 'LAK', 'KHR', 'RUB', 'BGN', 'HRK', 'ISK',
] as const

export type Currency = (typeof currencies)[number]

export const defaultCurrency: Currency = 'USD'
