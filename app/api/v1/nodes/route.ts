import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { nodes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  workflowId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  type: z.enum(['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse']),
  title: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).optional(),
  positionX: z.number().int(),
  positionY: z.number().int(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'MISSING_WORKFLOW_ID' }, { status: 400 })

  const results = await db.select().from(nodes).where(eq(nodes.workflowId, workflowId))
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const [node] = await db.insert(nodes).values({
    ...parsed.data,
    data: parsed.data.data || {},
    createdBy: userId,
  }).returning()

  return NextResponse.json({ data: node, error: null }, { status: 201 })
}
