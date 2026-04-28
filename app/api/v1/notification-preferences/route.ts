import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import {
  getPreferences,
  upsertPreference,
} from '@/lib/data/notification-preferences'

const NOTIF_TYPES = [
  'task_assigned',
  'task_due_soon',
  'decision_logged',
  'decision_outcome_pending',
  'thread_mention',
  'thread_reply',
  'workspace_invite',
] as const

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const preferences = await getPreferences({ userId, workspaceId })
  return NextResponse.json({ data: preferences, error: null })
}

const patchSchema = z.object({
  workspaceId: z.string().uuid(),
  preferences: z
    .array(
      z.object({
        type: z.enum(NOTIF_TYPES),
        in_app: z.boolean().optional(),
        email: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(NOTIF_TYPES.length),
})

export async function PATCH(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let updated = 0
  for (const pref of parsed.data.preferences) {
    const ok = await upsertPreference({
      userId,
      workspaceId: parsed.data.workspaceId,
      type: pref.type,
      in_app: pref.in_app,
      email: pref.email,
    })
    if (ok) updated++
  }

  const fresh = await getPreferences({ userId, workspaceId: parsed.data.workspaceId })
  return NextResponse.json({ data: { updated, preferences: fresh }, error: null })
}
