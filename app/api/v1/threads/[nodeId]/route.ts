import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { messages, threads } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  contentType: z.enum(['text', 'markdown']).optional(),
})

// GET /api/v1/threads/[nodeId] — list messages for a thread
export async function GET(
  req: Request,
  { params }: { params: { nodeId: string } }
) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { nodeId } = params

  // Find thread for this node
  const [thread] = await db.select().from(threads).where(eq(threads.nodeId, nodeId)).limit(1)
  if (!thread) {
    return NextResponse.json({ data: { thread: null, messages: [] }, error: null })
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.threadId, thread.id))
    .orderBy(desc(messages.createdAt))

  return NextResponse.json({ data: { thread, messages: msgs }, error: null })
}

// POST /api/v1/threads/[nodeId] — create or add message to thread
export async function POST(
  req: Request,
  { params }: { params: { nodeId: string } }
) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { nodeId } = params
  const body = await req.json()
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  // Find or create thread
  let [thread] = await db.select().from(threads).where(eq(threads.nodeId, nodeId)).limit(1)

  if (!thread) {
    // Need workspaceId — get from query param
    const url = new URL(req.url)
    const workspaceId = url.searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
    }
    ;[thread] = await db.insert(threads).values({
      nodeId,
      workspaceId,
      createdBy: userId,
    }).returning()
  }

  const [message] = await db.insert(messages).values({
    threadId: thread.id,
    content: parsed.data.content,
    contentType: parsed.data.contentType ?? 'text',
    createdBy: userId,
  }).returning()

  return NextResponse.json({ data: message, error: null }, { status: 201 })
}
