import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const portalSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

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

    if (!workspace?.ls_customer_portal_url) {
      return NextResponse.json({ error: 'NO_BILLING_CUSTOMER', message: 'Workspace has no active subscription. Subscribe first.' }, { status: 400 })
    }

    // Lemon Squeezy provides a customer portal URL directly on the subscription
    return NextResponse.json({ url: workspace.ls_customer_portal_url })
  } catch (err) {
    console.error('Billing portal error:', err)
    return NextResponse.json({ error: 'BILLING_ERROR', message: 'Failed to get portal URL.' }, { status: 500 })
  }
}
