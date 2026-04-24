import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

// GET /api/v1/workspace/[slug]
// Returns the workspace scoped to the URL slug, after auth + membership
// check. Powers client-side workspace-store hydration at layout mount —
// the upgrade modal, plan gates, and workspace selector all read from the
// store once this fires.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    // Dev fallback: return a synthetic workspace so the UI renders end-to-end
    // even when Supabase env vars are placeholders.
    return NextResponse.json({
      data: { id: 'dev-workspace', name: params.slug, slug: params.slug, plan: 'free', logo: null },
      error: null,
    })
  }

  const { data: workspace } = await db
    .from('workspaces')
    .select('id, name, slug, plan, logo')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!workspace) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const { data: membership } = await db
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  return NextResponse.json({ data: workspace, error: null })
}
