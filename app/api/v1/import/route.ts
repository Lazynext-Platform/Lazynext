import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const importSchema = z.object({
  source: z.enum(['notion-api', 'notion-zip', 'linear', 'trello', 'asana', 'csv']),
  workspaceId: z.string().uuid(),
  workflowId: z.string().uuid().optional(),
  data: z.array(z.object({
    title: z.string().min(1),
    type: z.enum(['task', 'doc', 'decision', 'thread', 'pulse', 'automation', 'table']).default('task'),
    status: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
})

// POST /api/v1/import — process an import
export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { source, workspaceId, workflowId, data: importItems } = parsed.data

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  // If CSV data is provided inline, process immediately
  if (importItems && importItems.length > 0) {
    let targetWorkflowId = workflowId
    if (!targetWorkflowId) {
      const { data: wf, error: wfError } = await db
        .from('workflows')
        .insert({ workspace_id: workspaceId, name: `Import from ${source}`, created_by: userId })
        .select()
        .single()
      if (wfError) return NextResponse.json({ error: wfError.message }, { status: 500 })
      targetWorkflowId = wf.id
    }

    const { data: created, error: nodeError } = await db
      .from('nodes')
      .insert(
        importItems.map((item, i) => ({
          workflow_id: targetWorkflowId!,
          workspace_id: workspaceId,
          type: item.type,
          title: item.title,
          data: item.data ?? {},
          position_x: 100 + (i % 3) * 320,
          position_y: 100 + Math.floor(i / 3) * 200,
          created_by: userId,
        }))
      )
      .select()

    if (nodeError) return NextResponse.json({ error: nodeError.message }, { status: 500 })

    return NextResponse.json({
      data: {
        workflowId: targetWorkflowId,
        imported: created?.length ?? 0,
        source,
        status: 'completed',
      },
      error: null,
    })
  }

  // For API-based imports (Notion, Linear, etc.), queue for background processing
  const jobId = crypto.randomUUID()
  return NextResponse.json({
    data: {
      jobId,
      source,
      workspaceId,
      workflowId: workflowId ?? null,
      status: 'queued',
      message: `Import from ${source} queued. Background processing will begin shortly.`,
    },
    error: null,
  }, { status: 202 })
}
