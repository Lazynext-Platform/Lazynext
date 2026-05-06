import { NextResponse } from 'next/server'
import { requireWorkspaceAuth } from '@/lib/utils/route-auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { hasFeature } from '@/lib/utils/plan-gates'
import { listAuditLog, recordAudit, type AuditAction } from '@/lib/data/audit-log'
import { parseAuditRange, rangeCutoffIso } from '@/lib/utils/audit-format'
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
  'ai.workflow.generated',
  'ai.workflow.accepted',
  'ai.workflow.refined',
]

/**
 * Actions a client (browser session or bearer key) is allowed to write
 * via POST. Every other action MUST be written by a server route in
 * response to the corresponding mutation, otherwise the audit log
 * loses its integrity guarantee. Today only the AI workflow accept /
 * refine clicks are client-emitted (#41 left this as a follow-up).
 */
const CLIENT_WRITABLE_ACTIONS: ReadonlySet<AuditAction> = new Set([
  'ai.workflow.accepted',
  'ai.workflow.refined',
])

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

  const range = parseAuditRange(url.searchParams.get('range'))
  const sinceIso = rangeCutoffIso(range)

  // Resource timeline (#52). Both keys must be set; we never let a
  // caller filter by resource_type alone (that would dump every node
  // event in the workspace). resourceType is restricted to a small
  // allowlist so a client can't probe arbitrary table names.
  const resourceTypeParam = url.searchParams.get('resourceType')
  const resourceIdParam = url.searchParams.get('resourceId')
  const RESOURCE_TYPES: ReadonlySet<string> = new Set([
    'node',
    'decision',
    'workspace',
    'api_key',
    'member',
  ])
  const resourceType =
    resourceTypeParam && RESOURCE_TYPES.has(resourceTypeParam) ? resourceTypeParam : null
  const resourceId = resourceType && resourceIdParam ? resourceIdParam : null

  const result = await listAuditLog({
    workspaceId,
    limit,
    cursor,
    action,
    sinceIso,
    resourceType,
    resourceId,
  })
  return NextResponse.json({ data: result, error: null })
}

/**
 * POST /api/v1/audit-log
 *
 * Body: `{ workspaceId, action, metadata?, resourceType?, resourceId? }`
 *
 * Lets a client record one of the `CLIENT_WRITABLE_ACTIONS` (today
 * just the AI workflow accept / refine clicks). Every other action is
 * rejected — server routes record their own audits when they perform
 * the matching mutation, so allowing a client to spoof e.g. a
 * `decision.delete` would let the audit log lie. Cookie session OR
 * bearer key both work; `viaApiKey` is recorded in metadata.
 *
 * Rate-limited via the shared mutation bucket. Workspace plan does
 * NOT gate writes — gating reads (the GET above) is enough; producers
 * write regardless of plan and the rows simply aren't readable on
 * lower tiers, matching how every other `recordAudit` call site
 * behaves.
 */
export async function POST(req: Request) {
  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const workspaceId = typeof b.workspaceId === 'string' ? b.workspaceId : null
  const action = typeof b.action === 'string' ? (b.action as AuditAction) : null
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }
  if (!action || !CLIENT_WRITABLE_ACTIONS.has(action)) {
    return NextResponse.json(
      {
        error: 'ACTION_NOT_ALLOWED',
        message: 'Only ai.workflow.accepted and ai.workflow.refined may be recorded by a client.',
      },
      { status: 400 },
    )
  }

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) {
    return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  }

  // Pull a bounded subset from `metadata` so a malicious client can't
  // dump arbitrary blobs into our audit table. Same fields the modal
  // emits in WorkflowGeneratorModal: prompt (truncated), nodeCount,
  // edgeCount, refineCount.
  const inputMeta = (b.metadata && typeof b.metadata === 'object'
    ? (b.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const metadata: Record<string, unknown> = {
    viaApiKey: auth.viaApiKey,
  }
  if (typeof inputMeta.prompt === 'string') {
    metadata.prompt = inputMeta.prompt.slice(0, 500)
  }
  if (typeof inputMeta.nodeCount === 'number' && Number.isFinite(inputMeta.nodeCount)) {
    metadata.nodeCount = Math.max(0, Math.floor(inputMeta.nodeCount))
  }
  if (typeof inputMeta.edgeCount === 'number' && Number.isFinite(inputMeta.edgeCount)) {
    metadata.edgeCount = Math.max(0, Math.floor(inputMeta.edgeCount))
  }
  if (typeof inputMeta.refineCount === 'number' && Number.isFinite(inputMeta.refineCount)) {
    metadata.refineCount = Math.max(0, Math.floor(inputMeta.refineCount))
  }

  const ok = await recordAudit({
    workspaceId,
    actorId: auth.userId,
    action,
    resourceType: typeof b.resourceType === 'string' ? b.resourceType : 'workspace',
    resourceId: typeof b.resourceId === 'string' ? b.resourceId : workspaceId,
    metadata,
    request: req,
  })

  if (!ok) {
    return NextResponse.json({ error: 'AUDIT_WRITE_FAILED' }, { status: 500 })
  }
  return NextResponse.json({ data: { recorded: true }, error: null }, { status: 201 })
}
