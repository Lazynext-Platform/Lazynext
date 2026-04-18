import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { layerForScore } from '@/lib/wms'

// GET /api/v1/workspace/[slug]/wms
// Returns the workspace's Workspace Maturity Score so the client can gate
// navigation. Auth + membership check enforced before the score leaks.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) {
    // Safe fallback: treat unconfigured DB as L4 so devs see everything.
    return NextResponse.json({ data: { score: 100, layer: 4, powerUserOverride: true }, error: null })
  }

  const { data: workspace } = await db
    .from('workspaces')
    .select('id, wms_score, power_user_override')
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

  const score = typeof workspace.wms_score === 'number' ? workspace.wms_score : 0
  const powerUserOverride = !!workspace.power_user_override
  return NextResponse.json({
    data: {
      score,
      layer: layerForScore(score),
      powerUserOverride,
    },
    error: null,
  })
}

// PATCH /api/v1/workspace/[slug]/wms
// Flip the per-workspace "Show me everything" toggle. This is the opt-out for
// power users who don't want progressive exposure.
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  let body: { powerUserOverride?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }

  const next = !!body.powerUserOverride

  const { data: workspace } = await db
    .from('workspaces')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!workspace) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const { data: membership } = await db
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  await db.from('workspaces').update({ power_user_override: next }).eq('id', workspace.id)
  return NextResponse.json({ data: { powerUserOverride: next }, error: null })
}
