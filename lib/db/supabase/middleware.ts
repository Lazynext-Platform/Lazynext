import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // DEV BYPASS: Skip auth when Supabase is not configured (placeholder credentials)
  const isDev = process.env.NODE_ENV === 'development'
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'
  if (isDev && isPlaceholder) {
    return supabaseResponse
  }

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
    request.nextUrl.pathname === '/docs' ||
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
