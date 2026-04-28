import { resolveAuth, requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { createNotification } from '@/lib/data/notifications'
import { recordAudit } from '@/lib/data/audit-log'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Authenticate FIRST so anonymous callers can't probe node existence.
  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { data: node, error } = await db
    .from('nodes')
    .select('*, threads(*)')
    .eq('id', params.id)
    .single()

  if (error || !node) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, node.workspace_id)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  return NextResponse.json({ data: node, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  // Verify ownership before update
  const { data: existing } = await db.from('nodes').select('workspace_id, type, assigned_to, title').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeCheck = requireScope(auth, 'write')
  if (scopeCheck) return scopeCheck.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const userId = auth.userId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { updated_by: userId }
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.data !== undefined) updateData.data = parsed.data.data
  if (parsed.data.positionX !== undefined) updateData.position_x = parsed.data.positionX
  if (parsed.data.positionY !== undefined) updateData.position_y = parsed.data.positionY
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.assignedTo !== undefined) updateData.assigned_to = parsed.data.assignedTo

  const { data: updated, error } = await db
    .from('nodes')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the new assignee on a real reassignment to a workspace member.
  if (
    parsed.data.assignedTo !== undefined &&
    parsed.data.assignedTo &&
    parsed.data.assignedTo !== existing.assigned_to &&
    existing.type === 'task' &&
    UUID_RE.test(parsed.data.assignedTo)
  ) {
    const { data: member } = await db
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', existing.workspace_id)
      .eq('user_id', parsed.data.assignedTo)
      .maybeSingle()
    if (member) {
      const { data: workspace } = await db.from('workspaces').select('slug').eq('id', existing.workspace_id).maybeSingle()
      const slug = (workspace as { slug?: string } | null)?.slug
      const newTitle = parsed.data.title ?? existing.title
      await createNotification({
        workspaceId: existing.workspace_id,
        userId: parsed.data.assignedTo,
        actorId: userId,
        type: 'task_assigned',
        title: 'You were assigned a task',
        body: String(newTitle).slice(0, 280),
        link: slug ? `/workspace/${slug}/tasks` : null,
        relatedNodeId: params.id,
      }).catch(() => undefined)
    }
  }

  await recordAudit({
    workspaceId: existing.workspace_id,
    actorId: userId,
    action: 'node.update',
    resourceType: 'node',
    resourceId: params.id,
    metadata: { changes: Object.keys(parsed.data), viaApiKey: auth.viaApiKey },
    request: req,
  }).catch(() => undefined)

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  // Verify ownership before delete
  const { data: existing } = await db.from('nodes').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeCheck = requireScope(auth, 'write')
  if (scopeCheck) return scopeCheck.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  await db.from('nodes').delete().eq('id', params.id)
  await recordAudit({
    workspaceId: existing.workspace_id,
    actorId: auth.userId,
    action: 'node.delete',
    resourceType: 'node',
    resourceId: params.id,
    metadata: { viaApiKey: auth.viaApiKey },
    request: req,
  }).catch(() => undefined)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
