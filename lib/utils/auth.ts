import { createClient } from '@/lib/db/supabase/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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

/**
 * Returns the full Supabase auth user, or null when no session.
 * Use when callers need email / user_metadata / providers, not just id.
 */
export async function safeAuthUser(): Promise<{ user: SupabaseUser | null }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return { user: user ?? null }
  } catch {
    return { user: null }
  }
}

/**
 * Verify user is a member of a workspace.
 * Returns true if authorized, false otherwise.
 */
export async function verifyWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const { data } = await db
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  return !!data
}
