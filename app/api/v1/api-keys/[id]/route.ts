import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { deleteApiKey } from '@/lib/data/api-keys'
import { recordAudit } from '@/lib/data/audit-log'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  // Path-id shape check before hitting the DB. Saves a query on
  // garbage URLs and gives the caller a 400 instead of a generic 404.
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'INVALID_KEY_ID' }, { status: 400 })
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const deleted = await deleteApiKey({ workspaceId, keyId: params.id })
  if (!deleted) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // Audit the revocation. Fire-and-forget; metadata records the id
  // because the row is now gone — there's nothing to look up later.
  void recordAudit({
    workspaceId,
    actorId: userId,
    action: 'api_key.revoke',
    resourceType: 'api_key',
    resourceId: params.id,
    request: req,
  })

  return NextResponse.json({ data: { revoked: true }, error: null })
}
