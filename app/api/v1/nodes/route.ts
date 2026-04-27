import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { createNotification } from '@/lib/data/notifications'
import { recordAudit } from '@/lib/data/audit-log'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const createSchema = z.object({
  workflowId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  type: z.enum(['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse']),
  title: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).optional(),
  positionX: z.number().int(),
  positionY: z.number().int(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'MISSING_WORKFLOW_ID' }, { status: 400 })

  const { data: workflow } = await db.from('workflows').select('workspace_id').eq('id', workflowId).single()
  if (!workflow) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, workflow.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { data: results, error } = await db.from('nodes').select('*').eq('workflow_id', workflowId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { data: node, error } = await db.from('nodes').insert({
    workflow_id: parsed.data.workflowId,
    workspace_id: parsed.data.workspaceId,
    type: parsed.data.type,
    title: parsed.data.title,
    data: parsed.data.data || {},
    position_x: parsed.data.positionX,
    position_y: parsed.data.positionY,
    status: parsed.data.status || null,
    assigned_to: parsed.data.assignedTo || null,
    created_by: userId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the assignee when this is a task assigned to a workspace member.
  // assigned_to is a free-form VARCHAR — only notify when it parses as
  // a UUID matching a real member; otherwise skip silently (honest).
  if (parsed.data.type === 'task' && parsed.data.assignedTo && UUID_RE.test(parsed.data.assignedTo)) {
    const { data: member } = await db
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', parsed.data.workspaceId)
      .eq('user_id', parsed.data.assignedTo)
      .maybeSingle()
    if (member) {
      const { data: workspace } = await db.from('workspaces').select('slug').eq('id', parsed.data.workspaceId).maybeSingle()
      const slug = (workspace as { slug?: string } | null)?.slug
      await createNotification({
        workspaceId: parsed.data.workspaceId,
        userId: parsed.data.assignedTo,
        actorId: userId,
        type: 'task_assigned',
        title: 'You were assigned a task',
        body: parsed.data.title.slice(0, 280),
        link: slug ? `/workspace/${slug}/tasks` : null,
        relatedNodeId: node.id,
      }).catch(() => undefined)
    }
  }

  await recordAudit({
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    action: 'node.create',
    resourceType: 'node',
    resourceId: node.id,
    metadata: { type: parsed.data.type, title: parsed.data.title.slice(0, 200) },
    request: req,
  }).catch(() => undefined)

  return NextResponse.json({ data: node, error: null }, { status: 201 })
}
