import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
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
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { nodeId } = params

  // Verify user has access to this node's workspace
  const { data: node } = await db.from('nodes').select('workspace_id').eq('id', nodeId).single()
  if (!node) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, node.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { data: thread } = await db
    .from('threads')
    .select('*')
    .eq('node_id', nodeId)
    .limit(1)
    .single()

  if (!thread) {
    return NextResponse.json({ data: { thread: null, messages: [] }, error: null })
  }

  const { data: msgs } = await db
    .from('messages')
    .select('*')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: { thread, messages: msgs || [] }, error: null })
}

// POST /api/v1/threads/[nodeId] — create or add message to thread
export async function POST(
  req: Request,
  { params }: { params: { nodeId: string } }
) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { nodeId } = params

  // Verify user has access to this node's workspace
  const { data: ownerNode } = await db.from('nodes').select('workspace_id').eq('id', nodeId).single()
  if (!ownerNode) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, ownerNode.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  // Find or create thread
  let { data: thread } = await db
    .from('threads')
    .select('*')
    .eq('node_id', nodeId)
    .limit(1)
    .single()

  if (!thread) {
    const url = new URL(req.url)
    const workspaceId = url.searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
    }
    const { data: newThread, error: threadError } = await db
      .from('threads')
      .insert({ node_id: nodeId, workspace_id: workspaceId, created_by: userId })
      .select()
      .single()
    if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 })
    thread = newThread
  }

  const { data: message, error: msgError } = await db
    .from('messages')
    .insert({
      thread_id: thread.id,
      content: parsed.data.content,
      content_type: parsed.data.contentType ?? 'text',
      created_by: userId,
    })
    .select()
    .single()

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })
  return NextResponse.json({ data: message, error: null }, { status: 201 })
}
