import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PLANS, type PlanId } from '@/lib/billing/plans'
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'
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
  if (!rl.success) return rateLimitResponse(rl.resetAt)

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

  const planConfig = PLANS[plan as Exclude<PlanId, 'free'>]
  const variantId = planConfig[interval]

  if (!variantId) {
    return NextResponse.json(
      { error: 'BILLING_NOT_CONFIGURED', message: 'Lemon Squeezy variant IDs are not set. Configure LEMONSQUEEZY_*_ID env vars.' },
      { status: 503 }
    )
  }

  if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
    return NextResponse.json(
      { error: 'BILLING_NOT_CONFIGURED', message: 'Set LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID env vars.' },
      { status: 503 }
    )
  }

  try {
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json(
        { error: 'APP_URL_NOT_CONFIGURED', message: 'Set NEXT_PUBLIC_APP_URL env var.' },
        { status: 503 }
      )
    }

    const { data, error } = await createCheckout(process.env.LEMONSQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        custom: { workspace_id: workspaceId, user_id: userId, plan },
      },
      productOptions: {
        redirectUrl: `${appUrl}/workspace/${workspaceId}/settings?billing=success`,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: 'BILLING_ERROR', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data?.data.attributes.url })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Lemon Squeezy checkout error:', err)
    return NextResponse.json(
      { error: 'BILLING_ERROR', message: 'Failed to create checkout session.' },
      { status: 500 }
    )
  }
}
