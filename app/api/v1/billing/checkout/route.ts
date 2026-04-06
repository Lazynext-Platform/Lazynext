import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PLANS, type PlanId } from '@/lib/billing/plans'

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

  const body = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { plan, interval, workspaceId } = parsed.data
  const planConfig = PLANS[plan as Exclude<PlanId, 'free'>]
  const priceId = planConfig[interval]

  if (!priceId) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe price IDs are not set. Configure STRIPE_*_ID env vars.' },
      { status: 503 }
    )
  }

  // When Stripe is installed, create a checkout session:
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'subscription',
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${workspaceId}/settings?billing=success`,
  //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${workspaceId}/billing`,
  //   metadata: { workspaceId, userId },
  // })
  // return NextResponse.json({ url: session.url })

  return NextResponse.json(
    {
      error: 'STRIPE_SDK_MISSING',
      message: 'Install stripe package and uncomment checkout logic to enable billing.',
      plan,
      interval,
      priceId,
    },
    { status: 501 }
  )
}
