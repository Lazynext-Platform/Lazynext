import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { getOrCreateDefaultWorkflow } from '@/lib/data/workspace'
import { z } from 'zod'

const querySchema = z.object({ workspaceId: z.string().uuid() })

// GET /api/v1/workflows/default?workspaceId=<uuid>
// Returns the default (oldest) workflow id for the workspace, creating
// one if none exists. Powers canvas hydration: the canvas page route
// is /canvas/default — it has no real workflow id in its URL — and
// resolves the workspace's first workflow on mount via this endpoint.
export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ workspaceId: url.searchParams.get('workspaceId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'MISSING_OR_INVALID_WORKSPACE_ID' }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const workflow = await getOrCreateDefaultWorkflow(parsed.data.workspaceId, userId)
  if (!workflow) {
    return NextResponse.json({ error: 'WORKFLOW_UNAVAILABLE' }, { status: 500 })
  }

  // Pull the workflow's name so the canvas can show it (e.g. share dialog).
  const { data: full } = await db
    .from('workflows')
    .select('id, name')
    .eq('id', workflow.id)
    .maybeSingle()

  return NextResponse.json({
    data: {
      id: workflow.id,
      name: (full as { name?: string } | null)?.name ?? 'Untitled workflow',
    },
    error: null,
  })
}
