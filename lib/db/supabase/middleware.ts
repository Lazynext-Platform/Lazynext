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

  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/pricing' ||
    request.nextUrl.pathname === '/features' ||
    request.nextUrl.pathname === '/comparison' ||
    request.nextUrl.pathname === '/about' ||
    request.nextUrl.pathname === '/changelog' ||
    request.nextUrl.pathname === '/templates' ||
    request.nextUrl.pathname === '/privacy' ||
    request.nextUrl.pathname === '/terms' ||
    request.nextUrl.pathname === '/contact' ||
    request.nextUrl.pathname === '/careers' ||
    // /docs and any sub-path (e.g. /docs/api) are public marketing
    // pages. Exact-matching '/docs' alone left /docs/api 307'ing to
    // /sign-in, which broke the public API reference.
    request.nextUrl.pathname === '/docs' ||
    request.nextUrl.pathname.startsWith('/docs/') ||
    request.nextUrl.pathname.startsWith('/blog') ||
    request.nextUrl.pathname.startsWith('/d/') ||
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up') ||
    request.nextUrl.pathname.startsWith('/auth/callback') ||
    request.nextUrl.pathname.startsWith('/shared/') ||
    request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
