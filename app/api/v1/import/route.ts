import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const importSchema = z.object({
  source: z.enum(['notion-api', 'notion-zip', 'linear', 'trello', 'asana', 'csv']),
  workspaceId: z.string().uuid(),
  workflowId: z.string().uuid().optional(),
  data: z.unknown().optional(),
})

// POST /api/v1/import — initiate an import job
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { source, workspaceId, workflowId } = parsed.data

  // In production, this would queue a background job via Inngest
  // For now, return a job reference the client can poll
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
