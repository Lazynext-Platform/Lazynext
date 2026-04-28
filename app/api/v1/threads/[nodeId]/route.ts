import { resolveAuth, requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  contentType: z.enum(['text', 'markdown']).optional(),
})

// GET /api/v1/threads/[nodeId] — list messages for a thread
export async function GET(
  req: Request,
  { params }: { params: { nodeId: string } }
) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Authenticate FIRST so anonymous callers can't probe node existence.
  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { nodeId } = params

  const { data: node } = await db.from('nodes').select('workspace_id').eq('id', nodeId).single()
  if (!node) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, node.workspace_id)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

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
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { nodeId } = params

  const { data: ownerNode } = await db.from('nodes').select('workspace_id').eq('id', nodeId).single()
  if (!ownerNode) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, ownerNode.workspace_id)
  if (!auth.ok) return auth.response
  const scopeCheck = requireScope(auth, 'write')
  if (scopeCheck) return scopeCheck.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const userId = auth.userId

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
    // Bearer requests carry the workspace; cookie sessions need it via query
    // for backwards compatibility. Use the authenticated workspace either way
    // — never trust the query string when a bearer key is present.
    const workspaceId = ownerNode.workspace_id
    const { data: newThread, error: threadError } = await db
      .from('threads')
      .insert({ node_id: nodeId, workspace_id: workspaceId, created_by: userId })
      .select()
      .single()
    if (threadError) {
      if (process.env.NODE_ENV === 'development') console.error('threads thread create:', threadError)
      return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
    }
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

  if (msgError) {
    if (process.env.NODE_ENV === 'development') console.error('threads message insert:', msgError)
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
  }
  return NextResponse.json({ data: message, error: null }, { status: 201 })
}
