import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import {
  rateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/utils/rate-limit'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { revokeUserSession } from '@/lib/data/sessions'
import {
  buildResponseHeaders,
  newRequestId,
  headersToObject,
} from '@/lib/utils/api-headers'
import { reportApiError } from '@/lib/utils/api-sentry'

export const dynamic = 'force-dynamic'

// Conservative UUID v4 shape check before round-tripping to PG.
// Rejecting malformed ids here keeps the rate-limit bucket from
// being spent on obvious junk.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * DELETE /api/v1/sessions/[id]
 *
 * Revokes a single device session. The underlying RPC scopes the
 * delete by both session id AND the calling user's id, so even a
 * spoofed url path can't touch another user's row. Cookie-session
 * only.
 *
 * Status codes:
 *   - 200 → revoked
 *   - 401 → no session
 *   - 400 → malformed session id
 *   - 404 → session not found OR not owned by the caller
 *   - 500 → unexpected DB error (also reported to Sentry)
 *
 * Note: the HTTP semantics intentionally hide "not found" vs "not
 * yours" behind the same 404 — leaking that distinction would be
 * an existence oracle on session ids.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json(
      { error: 'INVALID_SESSION_ID' },
      { status: 400, headers: baseHeaders },
    )
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED' },
      { status: 503, headers: baseHeaders },
    )
  }

  try {
    const revoked = await revokeUserSession(userId, params.id)
    if (!revoked) {
      return NextResponse.json(
        { error: 'SESSION_NOT_FOUND' },
        { status: 404, headers: baseHeaders },
      )
    }
    return NextResponse.json(
      { data: { revoked: true }, error: null },
      { status: 200, headers: baseHeaders },
    )
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/sessions/[id]',
      method: 'DELETE',
      requestId,
      userId,
      extra: { sessionId: params.id },
    })
    return NextResponse.json(
      { error: 'SESSION_REVOKE_FAILED', message: 'Could not revoke session.' },
      { status: 500, headers: baseHeaders },
    )
  }
}
