import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const portalSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = portalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { workspaceId } = parsed.data

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: 'Set STRIPE_SECRET_KEY env var to enable billing portal.' },
      { status: 503 }
    )
  }

  // When Stripe is installed, create a portal session:
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  // Fetch stripeCustomerId from workspace record in DB
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: stripeCustomerId,
  //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/workspace/${workspaceId}/billing`,
  // })
  // return NextResponse.json({ url: session.url })

  return NextResponse.json(
    {
      error: 'STRIPE_SDK_MISSING',
      message: 'Install stripe package and uncomment portal logic to enable billing management.',
      workspaceId,
    },
    { status: 501 }
  )
}
