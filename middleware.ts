import { updateSession } from '@/lib/db/supabase/middleware'
import { locales, defaultLocale } from '@/lib/i18n/config'
import type { NextRequest } from 'next/server'

function detectLocale(request: NextRequest): string {
  // 1. Check cookie (user explicitly chose a language)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale
  }

  // 2. Parse Accept-Language header
  const acceptLang = request.headers.get('Accept-Language')
  if (acceptLang) {
    const preferred = acceptLang
      .split(',')
      .map((part) => {
        const [lang, q] = part.trim().split(';q=')
        return { lang: lang.trim().split('-')[0], q: q ? parseFloat(q) : 1 }
      })
      .sort((a, b) => b.q - a.q)

    for (const { lang } of preferred) {
      if ((locales as readonly string[]).includes(lang)) {
        return lang
      }
    }
  }

  return defaultLocale
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Set locale cookie if not already present so next-intl can read it
  const locale = detectLocale(request)
  if (!request.cookies.get('NEXT_LOCALE')?.value) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
