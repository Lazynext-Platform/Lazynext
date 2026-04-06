import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Bypass Clerk when keys are placeholder/missing (local dev without Clerk account)
const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')
  && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder')

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/features',
  '/comparison',
  '/blog',
  '/about',
  '/changelog',
  '/templates',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default hasValidClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect()
      }
    })
  : function middleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
