import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { markNotificationRead } from '@/lib/data/notifications'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
  }

  const ok = await markNotificationRead({ userId, id })
  if (!ok) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ data: { ok: true }, error: null })
}
