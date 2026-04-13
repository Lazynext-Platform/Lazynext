import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const { workspaceId } = body
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const authorized = await verifyWorkspaceMember(userId, workspaceId as string)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // Fetch the template workflow with nodes and edges
  const { data: template } = await db
    .from('workflows')
    .select('*, nodes(*), edges:edges(*)')
    .eq('id', params.id)
    .single()

  if (!template || !template.is_template) {
    return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 })
  }

  // Prevent installing private templates from other workspaces
  if (!template.is_public && template.workspace_id !== workspaceId) {
    return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 })
  }

  // Create a copy of the workflow
  const { data: newWorkflow, error: wfError } = await db
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: template.name,
      description: template.description,
      created_by: userId,
    })
    .select()
    .single()

  if (wfError) return NextResponse.json({ error: wfError.message }, { status: 500 })

  // Copy nodes with new IDs
  const nodeIdMap = new Map<string, string>()
  for (const node of template.nodes || []) {
    const { data: newNode } = await db
      .from('nodes')
      .insert({
        workflow_id: newWorkflow.id,
        workspace_id: workspaceId,
        type: node.type,
        title: node.title,
        data: node.data,
        position_x: node.position_x,
        position_y: node.position_y,
        created_by: userId,
      })
      .select()
      .single()
    if (newNode) nodeIdMap.set(node.id, newNode.id)
  }

  // Copy edges with remapped node IDs
  for (const edge of template.edges || []) {
    const newSource = nodeIdMap.get(edge.source_id)
    const newTarget = nodeIdMap.get(edge.target_id)
    if (newSource && newTarget) {
      await db.from('edges').insert({
        workflow_id: newWorkflow.id,
        source_id: newSource,
        target_id: newTarget,
        condition: edge.condition,
      })
    }
  }

  return NextResponse.json({ data: newWorkflow, error: null }, { status: 201 })
}
