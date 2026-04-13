import { createClient } from '@/lib/db/supabase/server'

/**
 * Safe auth wrapper — returns userId from Supabase session
 */
export async function safeAuth(): Promise<{ userId: string | null }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return { userId: user?.id ?? null }
  } catch {
    return { userId: null }
  }
}
