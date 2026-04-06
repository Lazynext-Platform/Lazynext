import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_')
  && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('placeholder')

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (hasValidClerkKeys) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')
  }

  return <>{children}</>
}
