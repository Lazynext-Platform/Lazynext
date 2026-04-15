import type { Metadata } from 'next'
import { createClient } from '@/lib/db/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: { template: '%s | Lazynext', default: 'Workspace | Lazynext' },
  robots: 'noindex, nofollow',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // DEV BYPASS: Skip auth when Supabase is not configured (placeholder credentials)
  const isDev = process.env.NODE_ENV === 'development'
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'
  if (!(isDev && isPlaceholder)) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/sign-in')
  }

  return <>{children}</>
}
