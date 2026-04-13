import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const [workflowRes, nodeRes, decisionRes] = await Promise.all([
    db.from('workflows').select('*').eq('workspace_id', workspaceId),
    db.from('nodes').select('*').eq('workspace_id', workspaceId),
    db.from('decisions').select('*').eq('workspace_id', workspaceId),
  ])

  const allWorkflows = workflowRes.data || []
  const workflowIds = allWorkflows.map((w: { id: string }) => w.id)

  // Fetch edges for these workflows
  const { data: allEdges } = workflowIds.length > 0
    ? await db.from('edges').select('*').in('workflow_id', workflowIds)
    : { data: [] as unknown[] }

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workspaceId,
    workflows: allWorkflows,
    nodes: nodeRes.data || [],
    edges: allEdges || [],
    decisions: decisionRes.data || [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lazynext-export-${workspaceId}.json"`,
    },
  })
}
