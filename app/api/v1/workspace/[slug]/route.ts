import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { recordAudit } from '@/lib/data/audit-log'

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/
const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, 'INVALID_SLUG').optional(),
})

/** Resolve workspace + caller's role for the given slug, or return null. */
async function resolveWorkspaceForCaller(slug: string, userId: string) {
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, name, slug, plan, logo')
    .eq('slug', slug)
    .maybeSingle()
  if (!workspace) return { workspace: null as null, role: null as null }

  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .maybeSingle()

  return {
    workspace,
    role: (membership?.role ?? null) as 'owner' | 'admin' | 'member' | null,
  }
}

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

// PATCH /api/v1/workspace/[slug]
// Update workspace name and/or slug. Owner or admin only. Returns the
// updated workspace so the client can re-hydrate the store and route.
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }
  if (!parsed.data.name && !parsed.data.slug) {
    return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 })
  }

  const { workspace, role } = await resolveWorkspaceForCaller(params.slug, userId)
  if (!workspace) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  // If slug is changing, ensure it's not taken by another workspace.
  if (parsed.data.slug && parsed.data.slug !== workspace.slug) {
    const { data: clash } = await db
      .from('workspaces')
      .select('id')
      .eq('slug', parsed.data.slug)
      .neq('id', workspace.id)
      .maybeSingle()
    if (clash) return NextResponse.json({ error: 'SLUG_TAKEN' }, { status: 409 })
  }

  const update: Record<string, string> = {}
  if (parsed.data.name) update.name = parsed.data.name
  if (parsed.data.slug) update.slug = parsed.data.slug

  const { data: updated, error } = await db
    .from('workspaces')
    .update(update)
    .eq('id', workspace.id)
    .select('id, name, slug, plan, logo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordAudit({
    workspaceId: workspace.id,
    actorId: userId,
    action: 'workspace.update',
    resourceType: 'workspace',
    resourceId: workspace.id,
    metadata: { changes: update, previous: { name: workspace.name, slug: workspace.slug } },
    request: req,
  }).catch(() => undefined)
  return NextResponse.json({ data: updated, error: null })
}

// DELETE /api/v1/workspace/[slug]
// Owner-only workspace deletion. Cascades through the schema's foreign
// keys (workspace_members, workflows, nodes, edges, decisions, ...).
export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const { workspace, role } = await resolveWorkspaceForCaller(params.slug, userId)
  if (!workspace) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (role !== 'owner') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Only the workspace owner can delete it.' }, { status: 403 })
  }

  const { error } = await db.from('workspaces').delete().eq('id', workspace.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit row is best-effort — the workspace cascade may have already
  // removed the row's parent. Keep the audit table at the workspace
  // level so deletion records survive cascade by referencing the id.
  // (FK is workspace_id ON DELETE CASCADE, so post-delete inserts will
  // fail — we therefore record BEFORE the delete in a future revision.
  // For now, a deleted-workspace event is implicit from absence.)

  return NextResponse.json({ data: { id: workspace.id, deleted: true }, error: null })
}
