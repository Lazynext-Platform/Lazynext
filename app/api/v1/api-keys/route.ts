import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { hasFeature } from '@/lib/utils/plan-gates'
import { listApiKeys, createApiKey } from '@/lib/data/api-keys'
import { recordAudit } from '@/lib/data/audit-log'
import type { PLAN_LIMITS } from '@/lib/utils/constants'

type Plan = keyof typeof PLAN_LIMITS

// Plaintext keys are surfaced exactly once — at create time. List
// responses never include them; only the prefix + hash-derived metadata.
const CreateBody = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional().nullable(),
})

async function gatePlan(workspaceId: string): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  if (!hasValidDatabaseUrl) {
    return { ok: false, res: NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 }) }
  }
  const { data: workspace } = await db.from('workspaces').select('plan').eq('id', workspaceId).maybeSingle()
  const plan = ((workspace as { plan?: string } | null)?.plan ?? 'free') as Plan
  if (!hasFeature(plan, 'api-keys')) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'PLAN_GATE', message: 'API keys require the Enterprise plan.' },
        { status: 402 },
      ),
    }
  }
  return { ok: true }
}

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const gate = await gatePlan(workspaceId)
  if (!gate.ok) return gate.res

  const keys = await listApiKeys(workspaceId)
  return NextResponse.json({ data: { keys }, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const body = await req.json().catch(() => null)
  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const gate = await gatePlan(parsed.data.workspaceId)
  if (!gate.ok) return gate.res

  const created = await createApiKey({
    workspaceId: parsed.data.workspaceId,
    userId,
    name: parsed.data.name,
    expiresAt: parsed.data.expiresAt ?? null,
  })
  if (!created) {
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 })
  }

  // Audit the issuance. Fire-and-forget — a failed audit must not
  // fail the create. Metadata captures the prefix so an auditor can
  // tell which key was issued without storing the plaintext.
  void recordAudit({
    workspaceId: parsed.data.workspaceId,
    actorId: userId,
    action: 'api_key.create',
    resourceType: 'api_key',
    resourceId: created.row.id,
    metadata: { name: created.row.name, key_prefix: created.row.keyPrefix },
    request: req,
  })

  // The plaintext is in the response body exactly once. The client is
  // responsible for showing it to the user and discarding it after
  // copy. After this response, the only way to recover the key is to
  // mint a new one.
  return NextResponse.json(
    { data: { key: created.row, plaintext: created.plaintext }, error: null },
    { status: 201 },
  )
}
