import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale } from './config'

export default getRequestConfig(async () => {
  // Read locale from cookie set by middleware (detected from Accept-Language)
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  const locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : defaultLocale

  let messages
  try {
    messages = (await import(`../../messages/${locale}.json`)).default
  } catch {
    // Fall back to English if translation file doesn't exist yet
    messages = (await import('../../messages/en.json')).default
  }

  return { locale, messages }
})
