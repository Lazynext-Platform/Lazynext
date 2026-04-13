import type { Metadata } from 'next'
import { createClient } from '@/lib/db/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: { template: '%s | Lazynext', default: 'Workspace | Lazynext' },
  robots: 'noindex, nofollow',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  return <>{children}</>
}
