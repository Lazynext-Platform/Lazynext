import { updateSession } from '@/lib/db/supabase/middleware'
import { locales, defaultLocale } from '@/lib/i18n/config'
import type { NextRequest } from 'next/server'

function detectLocale(request: NextRequest): string {
  // 1. Check cookie (user explicitly chose a language)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as typeof locales[number])) {
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
      if (locales.includes(lang as typeof locales[number])) {
        return lang
      }
    }
  }

  return defaultLocale
}

/**
 * Generate a request id. Edge runtime always has Web Crypto.
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Set locale cookie if not already present so next-intl can read it
  // Skip for API routes — no need to set cookies on programmatic requests
  if (!request.nextUrl.pathname.startsWith('/api')) {
    const locale = detectLocale(request)
    if (!request.cookies.get('NEXT_LOCALE')?.value) {
      response.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        sameSite: 'lax',
      })
    }
  }

  // Stamp the public-API contract headers on every /api/v1/* response.
  // Route handlers that opt into `buildResponseHeaders` will have
  // already set these — we never clobber. This guarantees that EVERY
  // public-API response carries `X-Request-Id` + `X-API-Version`, even
  // routes that haven't been migrated to the shared header builder.
  // Per-request rate-limit / Retry-After / Sunset headers remain the
  // route handler's responsibility.
  if (request.nextUrl.pathname.startsWith('/api/v1')) {
    if (!response.headers.has('X-Request-Id')) {
      // Prefer a client-supplied id if present (lets a customer
      // correlate their own logs with ours).
      const upstream = request.headers.get('X-Request-Id')
      response.headers.set('X-Request-Id', upstream ?? generateRequestId())
    }
    if (!response.headers.has('X-API-Version')) {
      response.headers.set('X-API-Version', 'v1')
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
