import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { getTemplate } from '@/lib/data/template-catalog'
import { recordAudit } from '@/lib/data/audit-log'

const installSchema = z.object({
  templateId: z.string().min(1).max(64),
  workspaceId: z.string().uuid(),
})

/**
 * Installs a curated catalog template into the caller's workspace.
 *
 * Implementation: creates a new `workflows` row, then inserts each seed
 * node + remaps the seed edges' (source, target) by local id → real
 * UUID. Runs under the service-role admin client (RLS bypass safe
 * because we already verified workspace membership). Each install is
 * audit-logged.
 */
export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  const parsed = installSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const template = getTemplate(parsed.data.templateId)
  if (!template) return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 })

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { data: workflow, error: wfError } = await db
    .from('workflows')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: template.name,
      description: template.description,
      template_category: template.category,
      created_by: userId,
    })
    .select()
    .single()

  if (wfError || !workflow) {
    return NextResponse.json({ error: wfError?.message ?? 'CREATE_FAILED' }, { status: 500 })
  }

  // Insert nodes one at a time so we can capture the assigned UUID for
  // each seed id. (A bulk insert with .select() preserves order, but the
  // explicit loop is clearer and the catalog templates are small.)
  const idMap = new Map<string, string>()
  for (const seed of template.nodes) {
    const { data: node, error } = await db
      .from('nodes')
      .insert({
        workflow_id: workflow.id,
        workspace_id: parsed.data.workspaceId,
        type: seed.type,
        title: seed.title,
        data: seed.data ?? {},
        position_x: seed.position.x,
        position_y: seed.position.y,
        status: seed.status ?? null,
        created_by: userId,
      })
      .select('id')
      .single()
    if (error || !node) {
      return NextResponse.json({ error: error?.message ?? 'NODE_CREATE_FAILED' }, { status: 500 })
    }
    idMap.set(seed.id, (node as { id: string }).id)
  }

  // Remap edges to the new node ids and bulk-insert.
  const edgeRows = template.edges
    .map((e) => {
      const source_id = idMap.get(e.source)
      const target_id = idMap.get(e.target)
      if (!source_id || !target_id) return null
      return { workflow_id: workflow.id, source_id, target_id }
    })
    .filter((row): row is { workflow_id: string; source_id: string; target_id: string } => row !== null)

  if (edgeRows.length > 0) {
    await db
      .from('edges')
      .insert(edgeRows)
      .then(() => undefined, () => undefined)
  }

  await recordAudit({
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    action: 'node.create', // closest existing AuditAction; templates create N nodes
    resourceType: 'workflow',
    resourceId: workflow.id,
    metadata: {
      template_id: template.id,
      template_name: template.name,
      node_count: template.nodes.length,
    },
    request: req,
  }).catch(() => undefined)

  return NextResponse.json(
    {
      data: {
        workflowId: workflow.id,
        templateId: template.id,
        nodeCount: template.nodes.length,
        edgeCount: edgeRows.length,
      },
      error: null,
    },
    { status: 201 },
  )
}
