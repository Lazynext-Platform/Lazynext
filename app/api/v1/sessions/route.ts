import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import {
  rateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/utils/rate-limit'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { listUserSessions } from '@/lib/data/sessions'
import {
  buildResponseHeaders,
  newRequestId,
  headersToObject,
} from '@/lib/utils/api-headers'
import { reportApiError } from '@/lib/utils/api-sentry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/sessions
 *
 * Returns the active per-device sessions for the calling user.
 * Cookie-session only (dashboard surface). Not bearer-aware: an
 * API key has no concept of "list my devices" — keys ARE the
 * device. If a future SDK use case appears, add a separate
 * `/api/v1/me/sessions` with bearer support.
 *
 * Response: { data: UserSession[], error: null }
 *
 * Each row has been device-parsed server-side via parseUserAgent
 * so the UI doesn't ship a parser to the browser.
 */
export async function GET(_req: Request) {
  const requestId = newRequestId()
  const baseHeaders = headersToObject(buildResponseHeaders({ requestId }))

  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401, headers: baseHeaders },
    )
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) {
    const r = rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
    for (const [k, v] of Object.entries(baseHeaders)) r.headers.set(k, v)
    return r
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { data: [], error: null },
      { status: 200, headers: baseHeaders },
    )
  }

  try {
    const sessions = await listUserSessions(userId)
    return NextResponse.json(
      { data: sessions, error: null },
      { status: 200, headers: baseHeaders },
    )
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/sessions',
      method: 'GET',
      requestId,
      userId,
    })
    return NextResponse.json(
      { error: 'SESSION_LIST_FAILED', message: 'Could not load sessions.' },
      { status: 500, headers: baseHeaders },
    )
  }
}
