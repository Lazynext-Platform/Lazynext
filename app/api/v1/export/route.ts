import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { authenticateApiKey } from '@/lib/utils/api-key-auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

export async function GET(req: Request) {
  // Bearer auth first \u2014 a successful key resolves directly to a
  // workspace, skipping the session + membership check. If no bearer
  // is present, fall through to the standard cookie-session path.
  const apiKey = await authenticateApiKey(req)

  let userId: string | null = null
  let bearerWorkspaceId: string | null = null
  if (apiKey) {
    userId = apiKey.userId
    bearerWorkspaceId = apiKey.workspaceId
  } else {
    const session = await safeAuth()
    userId = session.userId
  }

  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  // For bearer requests, the key already binds the request to a
  // workspace. The query param is accepted for compatibility but must
  // match the bearer's workspace \u2014 otherwise reject as cross-tenant.
  const queryWorkspaceId = url.searchParams.get('workspaceId')
  const workspaceId = bearerWorkspaceId ?? queryWorkspaceId
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  if (bearerWorkspaceId && queryWorkspaceId && queryWorkspaceId !== bearerWorkspaceId) {
    return NextResponse.json({ error: 'WORKSPACE_MISMATCH' }, { status: 403 })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(workspaceId)) return NextResponse.json({ error: 'INVALID_WORKSPACE_ID' }, { status: 400 })

  // Bearer requests skip the membership check \u2014 the key itself is the
  // membership grant. Cookie-session requests still need it.
  if (!apiKey) {
    const authorized = await verifyWorkspaceMember(userId, workspaceId)
    if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

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
