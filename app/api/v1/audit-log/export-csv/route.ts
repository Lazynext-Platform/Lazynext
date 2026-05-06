import { NextResponse } from 'next/server'
import { requireWorkspaceAuth } from '@/lib/utils/route-auth'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { hasFeature } from '@/lib/utils/plan-gates'
import { AUDIT_CSV_CAP, auditLogToCsv } from '@/lib/utils/audit-log-csv'
import { parseAuditRange, rangeCutoffIso } from '@/lib/utils/audit-format'
import type { AuditAction, AuditRow } from '@/lib/data/audit-log'
import type { PLAN_LIMITS } from '@/lib/utils/constants'

type Plan = keyof typeof PLAN_LIMITS

const VALID_ACTIONS: ReadonlySet<AuditAction> = new Set([
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
  'ai.workflow.generated',
  'ai.workflow.accepted',
  'ai.workflow.refined',
])

/**
 * GET /api/v1/audit-log/export-csv?workspaceId=<uuid>&action=<AuditAction>
 *
 * Streams up to `AUDIT_CSV_CAP` audit rows as a CSV download. Cookie-
 * session OR bearer-key authenticated. Plan-gated to Business+ to
 * match the viewer page (#43) and the JSON list endpoint.
 */
export async function GET(req: Request) {
  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) return auth.response

  // Heavy read — share the `export` bucket with the existing CSV / JSON
  // export endpoints so a leaked bearer can't scrape via three routes
  // in parallel.
  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.export)
  if (!rl.success) {
    return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  }

  // Plan gate — Business+. Same flag as the JSON `/api/v1/audit-log`
  // endpoint and the `/audit-log` viewer page.
  const { data: workspace } = await db
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .maybeSingle()
  const plan = ((workspace as { plan?: string } | null)?.plan ?? 'free') as Plan
  if (!hasFeature(plan, 'audit-log')) {
    return NextResponse.json(
      { error: 'PLAN_GATE', message: 'Audit log requires the Business plan.' },
      { status: 402 },
    )
  }

  const actionParam = url.searchParams.get('action')
  const action =
    actionParam && VALID_ACTIONS.has(actionParam as AuditAction)
      ? (actionParam as AuditAction)
      : null

  const range = parseAuditRange(url.searchParams.get('range'))
  const sinceIso = rangeCutoffIso(range)

  let query = db
    .from('audit_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(AUDIT_CSV_CAP)
  if (action) query = query.eq('action', action)
  if (sinceIso) query = query.gte('created_at', sinceIso)

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: error.message },
      { status: 500 },
    )
  }

  const csv = auditLogToCsv((data ?? []) as AuditRow[])
  const stamp = new Date().toISOString().slice(0, 10)
  const filenameBits = ['lazynext-audit-log']
  if (action) filenameBits.push(action.replace(/\./g, '-'))
  if (range !== 'all') filenameBits.push(`${range}d`)
  filenameBits.push(stamp)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filenameBits.join('-')}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
