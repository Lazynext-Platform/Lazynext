import { auth } from '@clerk/nextjs/server'

const hasValidClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder')

/**
 * Safe auth wrapper — returns a dev userId when Clerk keys are placeholder
 */
export async function safeAuth(): Promise<{ userId: string | null }> {
  if (!hasValidClerkKeys) {
    return { userId: 'dev-user' }
  }
  return auth()
}
