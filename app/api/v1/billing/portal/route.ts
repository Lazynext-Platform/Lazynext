import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { reportApiError } from '@/lib/utils/api-sentry'

const portalSchema = z.object({
  workspaceId: z.string().uuid(),
})

function gumroadManageUrl(subscriptionId: string): string {
  return `https://app.gumroad.com/subscriptions/${encodeURIComponent(subscriptionId)}/manage`
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = portalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { workspaceId } = parsed.data

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const { data: workspace } = await db
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    const url =
      workspace?.gr_subscription_manage_url ||
      (workspace?.gr_subscription_id ? gumroadManageUrl(workspace.gr_subscription_id) : null)

    if (!url) {
      return NextResponse.json(
        { error: 'NO_BILLING_CUSTOMER', message: 'Workspace has no active subscription. Subscribe first.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ url })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/billing/portal',
      method: 'POST',
      userId,
      workspaceId,
    })
    return NextResponse.json({ error: 'BILLING_ERROR', message: 'Failed to get portal URL.' }, { status: 500 })
  }
}
