import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl, db } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { TRIGGER_TYPES, ACTION_TYPES, updateAutomation, deleteAutomation } from '@/lib/data/automations'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  triggerType: z.enum(TRIGGER_TYPES).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: z.enum(ACTION_TYPES).optional(),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

async function loadOwning(id: string, userId: string) {
  const { data } = await db.from('automations').select('workspace_id').eq('id', id).maybeSingle()
  if (!data) return null
  const ws = (data as { workspace_id: string }).workspace_id
  const ok = await verifyWorkspaceMember(userId, ws)
  return ok ? ws : null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const ws = await loadOwning(params.id, userId)
  if (!ws) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const ok = await updateAutomation(params.id, ws, parsed.data)
  if (!ok) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: { id: params.id }, error: null })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  const ws = await loadOwning(params.id, userId)
  if (!ws) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const ok = await deleteAutomation(params.id, ws)
  if (!ok) return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: { id: params.id }, error: null })
}
