import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PLANS, buildCheckoutUrl, type PlanId } from '@/lib/billing/plans'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  workspaceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { plan, interval, workspaceId } = parsed.data

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const planConfig = PLANS[plan as Exclude<PlanId, 'free'>]
  const productUrl = planConfig[interval]

  if (!productUrl) {
    return NextResponse.json(
      {
        error: 'BILLING_NOT_CONFIGURED',
        message:
          'Gumroad product URL is not set. Configure GUMROAD_*_URL (or NEXT_PUBLIC_GUMROAD_*_URL) env vars.',
      },
      { status: 503 }
    )
  }

  try {
    const url = buildCheckoutUrl(productUrl, { workspaceId, userId, plan, interval })
    return NextResponse.json({ url })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Gumroad checkout URL build error:', err)
    return NextResponse.json(
      { error: 'BILLING_ERROR', message: 'Failed to build checkout URL.' },
      { status: 500 }
    )
  }
}
