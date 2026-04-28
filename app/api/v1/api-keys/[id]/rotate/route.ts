import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { rotateApiKey } from '@/lib/data/api-keys'
import { recordAudit } from '@/lib/data/audit-log'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/v1/api-keys/[id]/rotate?workspaceId=<uuid>
//
// Generates a fresh plaintext for an existing key id, invalidating
// the old plaintext atomically. The id, name, scopes, expires_at and
// audit lineage are preserved so dashboards and audit-log queries can
// still trace the key's history. The new plaintext is shown exactly
// once, same contract as creation.
//
// Cookie-session only — rotating a key from the same key it
// authenticates with is too easy to footgun (you'd have to update
// every consumer instantly to avoid lockout). The dashboard is the
// right surface.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: 'INVALID_KEY_ID' }, { status: 400 })
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const rotated = await rotateApiKey({ workspaceId, keyId: params.id })
  if (!rotated) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // Audit the rotation. Same resourceId as the create entry so the
  // audit log naturally groups create → rotate(s) → revoke for one key.
  void recordAudit({
    workspaceId,
    actorId: userId,
    action: 'api_key.rotate',
    resourceType: 'api_key',
    resourceId: params.id,
    metadata: {
      name: rotated.row.name,
      key_prefix: rotated.row.keyPrefix,
      scopes: rotated.row.scopes,
    },
    request: req,
  })

  // Same contract as create: plaintext shown once, then discarded.
  return NextResponse.json(
    { data: { key: rotated.row, plaintext: rotated.plaintext }, error: null },
    { status: 200 },
  )
}
