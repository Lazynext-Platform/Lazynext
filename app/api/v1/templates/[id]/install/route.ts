import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workflows, nodes, edges } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { workspaceId } = await req.json()
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  // Fetch the template workflow
  const template = await db.query.workflows.findFirst({
    where: eq(workflows.id, params.id),
    with: { nodes: true, edges: true },
  })

  if (!template || !template.isTemplate) {
    return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 })
  }

  // Create a copy of the workflow
  const [newWorkflow] = await db.insert(workflows).values({
    workspaceId,
    name: template.name,
    description: template.description,
    createdBy: userId,
  }).returning()

  // Copy nodes with new IDs
  const nodeIdMap = new Map<string, string>()
  for (const node of template.nodes) {
    const [newNode] = await db.insert(nodes).values({
      workflowId: newWorkflow.id,
      workspaceId,
      type: node.type,
      title: node.title,
      data: node.data,
      positionX: node.positionX,
      positionY: node.positionY,
      createdBy: userId,
    }).returning()
    nodeIdMap.set(node.id, newNode.id)
  }

  // Copy edges with remapped node IDs
  for (const edge of template.edges) {
    const newSource = nodeIdMap.get(edge.sourceId)
    const newTarget = nodeIdMap.get(edge.targetId)
    if (newSource && newTarget) {
      await db.insert(edges).values({
        workflowId: newWorkflow.id,
        sourceId: newSource,
        targetId: newTarget,
        condition: edge.condition,
      })
    }
  }

  return NextResponse.json({ data: newWorkflow, error: null }, { status: 201 })
}
