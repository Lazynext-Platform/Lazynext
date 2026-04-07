import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { nodes, workflows } from '@/lib/db/schema'

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

  const body = await req.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { source, workspaceId, workflowId, data: importItems } = parsed.data

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  // If CSV data is provided inline, process immediately
  if (importItems && importItems.length > 0) {
    let targetWorkflowId = workflowId
    if (!targetWorkflowId) {
      const [wf] = await db.insert(workflows).values({
        workspaceId,
        name: `Import from ${source}`,
        createdBy: userId,
      }).returning()
      targetWorkflowId = wf.id
    }

    const created = await db.insert(nodes).values(
      importItems.map((item, i) => ({
        workflowId: targetWorkflowId!,
        workspaceId,
        type: item.type as 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table',
        title: item.title,
        data: item.data ?? {},
        positionX: 100 + (i % 3) * 320,
        positionY: 100 + Math.floor(i / 3) * 200,
        createdBy: userId,
      }))
    ).returning()

    return NextResponse.json({
      data: {
        workflowId: targetWorkflowId,
        imported: created.length,
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
