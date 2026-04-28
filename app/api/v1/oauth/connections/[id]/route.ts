import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { deleteOAuthConnection } from '@/lib/data/oauth-connections'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  workspaceId: z.string().uuid(),
})

/**
 * DELETE /api/v1/oauth/connections/[id]?workspaceId=<uuid>
 *
 * Removes the OAuth connection from this workspace. The DB delete is
 * scoped by `(id, workspace_id)` so a stale id from another workspace
 * can never delete this one's row. Returns 404 when no row matches.
 *
 * Provider-side revocation (calling the vendor's revoke endpoint to
 * invalidate the access token) is the responsibility of each
 * provider adapter — the user expectation is "the connection is gone
 * from my workspace," and that we deliver here. Adapters can layer
 * provider-side revocation in their own callsites without needing
 * this route to change.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  // Validate id shape early — the path param is untrusted input and
  // we don't want a malformed string reaching the DB query.
  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) {
    return NextResponse.json({ error: 'INVALID_CONNECTION_ID' }, { status: 400 })
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ workspaceId: url.searchParams.get('workspaceId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const deleted = await deleteOAuthConnection({
    workspaceId: parsed.data.workspaceId,
    connectionId: params.id,
  })
  if (deleted === 0) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ data: { deleted }, error: null })
}
