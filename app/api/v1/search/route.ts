import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { nodes, decisions, workflows } from '@/lib/db/schema'
import { eq, or, ilike, desc } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')
  const workspaceId = url.searchParams.get('workspaceId')

  if (!q || !workspaceId) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 })
  }

  const pattern = `%${q}%`

  const [nodeResults, decisionResults, workflowResults] = await Promise.all([
    db.select().from(nodes)
      .where(eq(nodes.workspaceId, workspaceId))
      .limit(10),
    db.select().from(decisions)
      .where(eq(decisions.workspaceId, workspaceId))
      .limit(10),
    db.select().from(workflows)
      .where(eq(workflows.workspaceId, workspaceId))
      .limit(5),
  ])

  // Client-side filter for compatibility
  const filteredNodes = nodeResults.filter((n) =>
    n.title.toLowerCase().includes(q.toLowerCase())
  )
  const filteredDecisions = decisionResults.filter((d) =>
    d.question.toLowerCase().includes(q.toLowerCase()) ||
    (d.resolution || '').toLowerCase().includes(q.toLowerCase())
  )
  const filteredWorkflows = workflowResults.filter((w) =>
    w.name.toLowerCase().includes(q.toLowerCase())
  )

  return NextResponse.json({
    data: {
      nodes: filteredNodes,
      decisions: filteredDecisions,
      workflows: filteredWorkflows,
    },
    error: null,
  })
}
