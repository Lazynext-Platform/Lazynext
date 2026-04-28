import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { looksLikePlaceholder } from '@/lib/db/client'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Short-circuit when Supabase env vars are missing or still hold stock
  // placeholder values (e.g. CI preview builds, fresh clones). Calling
  // createServerClient with placeholders throws 'URL and Key are required'
  // on every request and crashes the server before any page renders.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (looksLikePlaceholder(supabaseUrl) || looksLikePlaceholder(supabaseAnonKey)) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug session issues.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth gate uses a SHORT protected-route prefix list rather than an
  // ever-growing public allowlist. The old allowlist approach 307'd every
  // unknown path (typos, fake URLs, deprecated routes) to /sign-in, which
  // hurt SEO and confused users — Next.js's not-found.tsx never got a
  // chance to render. We flip it: middleware only intervenes on routes
  // that genuinely require a session. Everything else flows through to
  // Next.js routing, which renders the page if it exists or 404s if not.
  const PROTECTED_PREFIXES = [
    '/workspace',
    '/onboarding',
  ]
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname === prefix ||
    request.nextUrl.pathname.startsWith(`${prefix}/`)
  )

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    // Preserve where the user was trying to go so sign-in can return them.
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`
    if (next && next !== '/sign-in') {
      url.searchParams.set('next', next)
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
