import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { incrementWmsFor } from '@/lib/wms'

const updateSchema = z.object({
  resolution: z.string().optional(),
  rationale: z.string().optional(),
  status: z.enum(['open', 'decided', 'reversed', 'deferred']).optional(),
  outcome: z.enum(['good', 'bad', 'neutral', 'pending']).optional(),
  outcomeNotes: z.string().optional(),
  outcomeConfidence: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Look up the decision first so we know which workspace to bind to.
  // This is a tiny indexed read; cheap enough to do before auth so we
  // can hand requireWorkspaceAuth a concrete workspaceId. The bearer
  // path then gets a free 403 WORKSPACE_MISMATCH if the key targets a
  // different workspace.
  const { data: decision, error } = await db
    .from('decisions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, decision.workspace_id)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  return NextResponse.json({ data: decision, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: existing } = await db.from('decisions').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeFail = requireScope(auth, 'write')
  if (scopeFail) return scopeFail.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.resolution !== undefined) updateData.resolution = parsed.data.resolution
  if (parsed.data.rationale !== undefined) updateData.rationale = parsed.data.rationale
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.outcome !== undefined) updateData.outcome = parsed.data.outcome
  if (parsed.data.outcomeNotes !== undefined) updateData.outcome_notes = parsed.data.outcomeNotes
  if (parsed.data.outcomeConfidence !== undefined) updateData.outcome_confidence = parsed.data.outcomeConfidence
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags

  if (parsed.data.outcome && parsed.data.outcome !== 'pending') {
    updateData.outcome_tagged_by = auth.userId
    updateData.outcome_tagged_at = new Date().toISOString()
  }

  const { data: updated, error } = await db
    .from('decisions')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // WMS: outcome transitions from pending to a real verdict are the moat's
  // compounding signal. Credit the workspace.
  if (parsed.data.outcome && parsed.data.outcome !== 'pending') {
    await incrementWmsFor(existing.workspace_id, 'outcome_recorded').catch(() => undefined)
  }

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: existing } = await db.from('decisions').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeFail = requireScope(auth, 'write')
  if (scopeFail) return scopeFail.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  await db.from('decisions').delete().eq('id', params.id)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
