import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  regenerate: z.boolean().optional(),
})

async function loadWorkflow(id: string) {
  const { data } = await db
    .from('workflows')
    .select('id, workspace_id, share_token, shared_at, name')
    .eq('id', id)
    .maybeSingle()
  return data as
    | { id: string; workspace_id: string; share_token: string | null; shared_at: string | null; name: string }
    | null
}

/**
 * GET — return the current share state. Workspace members only.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  const wf = await loadWorkflow(params.id)
  if (!wf) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const ok = await verifyWorkspaceMember(userId, wf.workspace_id)
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  return NextResponse.json({
    data: {
      enabled: wf.share_token !== null,
      shareToken: wf.share_token,
      sharedAt: wf.shared_at,
    },
    error: null,
  })
}

/**
 * PATCH — toggle public sharing.
 *   { enabled: true }              → mint a token if none exists, else no-op
 *   { enabled: false }             → null the token (revoke all current links)
 *   { enabled: true, regenerate }  → mint a fresh token (invalidates the old one)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })

  const wf = await loadWorkflow(params.id)
  if (!wf) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const ok = await verifyWorkspaceMember(userId, wf.workspace_id)
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let nextToken: string | null = wf.share_token
  let nextSharedAt: string | null = wf.shared_at

  if (parsed.data.enabled === false) {
    nextToken = null
    nextSharedAt = null
  } else if (parsed.data.enabled === true) {
    if (!wf.share_token || parsed.data.regenerate) {
      nextToken = randomUUID()
      nextSharedAt = new Date().toISOString()
    }
  } else if (parsed.data.regenerate && wf.share_token) {
    nextToken = randomUUID()
    nextSharedAt = new Date().toISOString()
  }

  const { error } = await db
    .from('workflows')
    .update({ share_token: nextToken, shared_at: nextSharedAt })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: {
      enabled: nextToken !== null,
      shareToken: nextToken,
      sharedAt: nextSharedAt,
    },
    error: null,
  })
}
