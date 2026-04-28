import { NextResponse } from 'next/server'
import { requireWorkspaceAuth } from '@/lib/utils/route-auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { hasFeature } from '@/lib/utils/plan-gates'
import { listAuditLog, type AuditAction } from '@/lib/data/audit-log'
import { PLAN_LIMITS } from '@/lib/utils/constants'

type Plan = keyof typeof PLAN_LIMITS

const VALID_ACTIONS: AuditAction[] = [
  'workspace.update',
  'workspace.delete',
  'decision.create',
  'decision.update',
  'decision.delete',
  'node.create',
  'node.update',
  'node.delete',
  'member.invite',
  'member.remove',
  'member.role_update',
  'api_key.create',
  'api_key.rotate',
  'api_key.revoke',
]

export async function GET(req: Request) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) return auth.response
  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  // Plan gate. Audit log is a Business+/Enterprise feature.
  const { data: workspace } = await db.from('workspaces').select('plan').eq('id', workspaceId).maybeSingle()
  const plan = ((workspace as { plan?: string } | null)?.plan ?? 'free') as Plan
  if (!hasFeature(plan, 'audit-log')) {
    return NextResponse.json({ error: 'PLAN_GATE', message: 'Audit log requires the Business plan.' }, { status: 402 })
  }

  const limit = Number(url.searchParams.get('limit') ?? '50')
  const cursor = url.searchParams.get('cursor')
  const actionParam = url.searchParams.get('action')
  const action = actionParam && (VALID_ACTIONS as readonly string[]).includes(actionParam)
    ? (actionParam as AuditAction)
    : null

  const result = await listAuditLog({ workspaceId, limit, cursor, action })
  return NextResponse.json({ data: result, error: null })
}
