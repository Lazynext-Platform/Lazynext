import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_NOT_CONFIGURED' }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'WEBHOOK_SIGNATURE_INVALID' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.metadata?.workspaceId
        if (workspaceId && hasValidDatabaseUrl) {
          await db.from('workspaces').update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan: (session.metadata?.plan as 'starter' | 'pro' | 'business') ?? 'starter',
          }).eq('id', workspaceId)
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (hasValidDatabaseUrl) {
          await db.from('workspaces').update({
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', subscription.id)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        if (hasValidDatabaseUrl) {
          await db.from('workspaces').update({
            plan: 'free',
            stripe_subscription_id: null,
          }).eq('stripe_subscription_id', subscription.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 })
  }
}
