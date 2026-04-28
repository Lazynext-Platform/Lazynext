import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  listAutomations,
  createAutomation,
  listRecentRuns,
} from '@/lib/data/automations'

const triggerEnum = z.enum(TRIGGER_TYPES)
const actionEnum = z.enum(ACTION_TYPES)

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  triggerType: triggerEnum,
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: actionEnum,
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
})

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const includeRuns = url.searchParams.get('includeRuns') === 'true'
  const automations = await listAutomations(workspaceId)
  const runs = includeRuns ? await listRecentRuns({ workspaceId, limit: 50 }) : []
  return NextResponse.json({ data: { automations, runs }, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const authorized = await verifyWorkspaceMember(userId, parsed.data.workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const created = await createAutomation({
    workspaceId: parsed.data.workspaceId,
    createdBy: userId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    triggerType: parsed.data.triggerType,
    triggerConfig: parsed.data.triggerConfig ?? {},
    actionType: parsed.data.actionType,
    actionConfig: parsed.data.actionConfig ?? {},
    enabled: parsed.data.enabled ?? true,
  })
  if (!created) return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: { id: created.id }, error: null }, { status: 201 })
}
