import { resolveAuth, requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const createSchema = z.object({
  workflowId: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  condition: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(req: Request) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'MISSING_WORKFLOW_ID' }, { status: 400 })

  // Authenticate FIRST so anonymous callers can't probe workflow existence.
  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { data: workflow } = await db.from('workflows').select('workspace_id').eq('id', workflowId).single()
  if (!workflow) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, workflow.workspace_id)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const { data: results, error } = await db.from('edges').select('*').eq('workflow_id', workflowId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { data: wf } = await db.from('workflows').select('workspace_id').eq('id', parsed.data.workflowId).single()
  if (!wf) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, wf.workspace_id)
  if (!auth.ok) return auth.response
  const scopeCheck = requireScope(auth, 'write')
  if (scopeCheck) return scopeCheck.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const { data: edge, error } = await db.from('edges').insert({
    workflow_id: parsed.data.workflowId,
    source_id: parsed.data.sourceId,
    target_id: parsed.data.targetId,
    condition: parsed.data.condition || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: edge, error: null }, { status: 201 })
}

export async function DELETE(req: Request) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })

  const preAuth = await resolveAuth(req)
  if (!preAuth.ok) return preAuth.response

  const { data: existing } = await db.from('edges').select('workflow_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const { data: workflow } = await db.from('workflows').select('workspace_id').eq('id', existing.workflow_id).single()
  if (!workflow) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, workflow.workspace_id)
  if (!auth.ok) return auth.response
  const scopeCheck = requireScope(auth, 'write')
  if (scopeCheck) return scopeCheck.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const { error } = await db.from('edges').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { deleted: true }, error: null })
}
