import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

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
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: decision, error } = await db
    .from('decisions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const authorized = await verifyWorkspaceMember(userId, decision.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  return NextResponse.json({ data: decision, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Verify ownership before update
  const { data: existing } = await db.from('decisions').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, existing.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

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
    updateData.outcome_tagged_by = userId
    updateData.outcome_tagged_at = new Date().toISOString()
  }

  const { data: updated, error } = await db
    .from('decisions')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Verify ownership before delete
  const { data: existing } = await db.from('decisions').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, existing.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  await db.from('decisions').delete().eq('id', params.id)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
