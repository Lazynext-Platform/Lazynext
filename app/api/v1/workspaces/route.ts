import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

// GET /api/v1/workspaces
// Lists every workspace the authenticated user is a member of, with the
// caller's role on each. Powers the sidebar workspace switcher dropdown.
//
// Response shape: { data: Array<{ id, name, slug, plan, logo, role }>, error: null }
export async function GET() {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ data: [], error: null })
  }

  const { data: memberships, error } = await db
    .from('workspace_members')
    .select('role, workspace:workspaces ( id, name, slug, plan, logo )')
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 })
  }

  const rows = (memberships ?? [])
    .map((m) => {
      const w = (m as { workspace: unknown }).workspace
      // Supabase returns the joined row as a single object when the FK
      // is a singular relation, but the typed client surfaces it as an
      // array in some configurations. Normalize.
      const ws = Array.isArray(w) ? w[0] : w
      if (!ws || typeof ws !== 'object') return null
      const ref = ws as { id: string; name: string; slug: string; plan: string; logo: string | null }
      return {
        id: ref.id,
        name: ref.name,
        slug: ref.slug,
        plan: ref.plan,
        logo: ref.logo,
        role: (m as { role: 'owner' | 'admin' | 'member' }).role,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    // Stable order: alphabetical by name.
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ data: rows, error: null })
}
