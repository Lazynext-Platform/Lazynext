import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workflows, nodes, edges, decisions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const [allWorkflows, allNodes, allEdges, allDecisions] = await Promise.all([
    db.select().from(workflows).where(eq(workflows.workspaceId, workspaceId)),
    db.select().from(nodes).where(eq(nodes.workspaceId, workspaceId)),
    db.select().from(edges),
    db.select().from(decisions).where(eq(decisions.workspaceId, workspaceId)),
  ])

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workspaceId,
    workflows: allWorkflows,
    nodes: allNodes,
    edges: allEdges.filter((e) => allWorkflows.some((w) => w.id === e.workflowId)),
    decisions: allDecisions,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lazynext-export-${workspaceId}.json"`,
    },
  })
}
