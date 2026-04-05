import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 })
  }

  // Stripe webhook verification would go here
  // For now, acknowledge the webhook
  try {
    // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    // Handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'WEBHOOK_ERROR' }, { status: 400 })
  }
}
