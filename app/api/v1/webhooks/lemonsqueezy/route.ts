import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(req: Request) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`webhook:${ip}`, RATE_LIMITS.webhook)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const body = await req.text()
  const sig = headers().get('x-signature')

  if (!sig) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 })
  }

  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 })
  }

  if (!verifySignature(body, sig, process.env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'WEBHOOK_SIGNATURE_INVALID' }, { status: 400 })
  }

  try {
    const event = JSON.parse(body)
    const eventName = event.meta?.event_name
    const customData = event.meta?.custom_data
    const attrs = event.data?.attributes
    const eventId = event.meta?.event_id

    // Idempotency: atomically insert event_id (unique constraint prevents duplicates)
    if (eventId && hasValidDatabaseUrl) {
      const { error: insertError } = await db
        .from('webhook_events')
        .insert({ event_id: String(eventId), event_name: eventName, processed_at: new Date().toISOString() })
      if (insertError?.code === '23505') {
        // Unique violation — already processed
        return NextResponse.json({ received: true, duplicate: true })
      }
    }

    switch (eventName) {
      case 'subscription_created': {
        const workspaceId = customData?.workspace_id
        const plan = customData?.plan
        if (workspaceId && hasValidDatabaseUrl) {
          await db.from('workspaces').update({
            ls_customer_id: String(attrs.customer_id),
            ls_subscription_id: String(event.data.id),
            ls_customer_portal_url: attrs.urls?.customer_portal ?? null,
            plan: (plan as 'starter' | 'pro' | 'business') ?? 'starter',
          }).eq('id', workspaceId)
        }
        break
      }
      case 'subscription_updated': {
        if (hasValidDatabaseUrl && attrs) {
          const update: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            ls_customer_portal_url: attrs.urls?.customer_portal ?? null,
          }
          // If subscription was cancelled but still active until period end
          if (attrs.status === 'cancelled') {
            update.plan = 'free'
            update.ls_subscription_id = null
          }
          await db.from('workspaces').update(update)
            .eq('ls_subscription_id', String(event.data.id))
        }
        break
      }
      case 'subscription_expired':
      case 'subscription_cancelled': {
        if (hasValidDatabaseUrl) {
          await db.from('workspaces').update({
            plan: 'free',
            ls_subscription_id: null,
          }).eq('ls_subscription_id', String(event.data.id))
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Lemon Squeezy webhook processing error:', err)
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 })
  }
}
