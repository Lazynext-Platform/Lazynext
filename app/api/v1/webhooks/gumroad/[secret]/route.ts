import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { inngest, EVENTS } from '@/lib/inngest/client'

type PingPayload = Record<string, string>

/**
 * Timing-safe string equality check — prevents leaking info via response time.
 * Returns false when inputs differ in length (without short-circuiting).
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Parse Gumroad's form-encoded ping body into a flat key/value map.
 * Arrays (`url_params[workspace_id]`) and nested fields come through as
 * dotted/bracketed keys — we keep them raw and read the ones we need.
 */
function parseForm(body: string): PingPayload {
  const out: PingPayload = {}
  for (const [key, value] of new URLSearchParams(body).entries()) {
    out[key] = value
  }
  return out
}

function getUrlParam(payload: PingPayload, key: string): string | undefined {
  // Gumroad echoes our query-string params as `url_params[<key>]`
  return payload[`url_params[${key}]`]
}

function deriveManageUrl(subscriptionId: string | undefined): string | null {
  if (!subscriptionId) return null
  return `https://app.gumroad.com/subscriptions/${encodeURIComponent(subscriptionId)}/manage`
}

export async function POST(
  req: Request,
  { params }: { params: { secret: string } }
) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`webhook:${ip}`, RATE_LIMITS.webhook)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const expected = process.env.GUMROAD_WEBHOOK_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 })
  }

  // URL-secret auth: the last path segment must equal the configured secret.
  // Gumroad pings are not HMAC-signed, so shared-secret-in-URL is the
  // officially recommended strategy (pair it with HTTPS-only).
  if (!safeEqual(params.secret, expected)) {
    trackBillingEvent('webhook.ping.unauthorized', { ip })
    return NextResponse.json({ error: 'WEBHOOK_UNAUTHORIZED' }, { status: 401 })
  }

  const contentType = headers().get('content-type') || ''
  const body = await req.text()
  const payload: PingPayload = contentType.includes('application/json')
    ? JSON.parse(body)
    : parseForm(body)

  // Gumroad sends ping kinds via distinct resource endpoints. For the
  // primary sale/ping endpoint the payload has no `resource_name` field;
  // the "Resource Subscription" endpoints include one. We detect both.
  const resource = payload['resource_name'] || (payload['sale_id'] ? 'sale' : 'unknown')
  const saleId = payload['sale_id']
  const subscriptionId = payload['subscription_id']
  const eventDedupeKey = saleId || subscriptionId

  trackBillingEvent('webhook.ping.received', {
    resource,
    subscriptionId: subscriptionId ?? null,
    saleId: saleId ?? null,
  })

  // Idempotency — skip duplicate deliveries. Gumroad retries failed pings.
  if (eventDedupeKey && hasValidDatabaseUrl) {
    const { error: insertError } = await db
      .from('webhook_events')
      .insert({
        event_id: `gumroad:${resource}:${eventDedupeKey}`,
        event_name: resource,
        processed_at: new Date().toISOString(),
      })
    if (insertError?.code === '23505') {
      trackBillingEvent('webhook.ping.duplicate', { resource, dedupeKey: eventDedupeKey })
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  try {
    switch (resource) {
      case 'sale': {
        // New purchase (first charge of a subscription or a one-off sale).
        const workspaceId = getUrlParam(payload, 'workspace_id')
        const plan = (getUrlParam(payload, 'plan') as 'starter' | 'pro' | 'business' | undefined) ?? 'starter'
        const email = payload['email']
        if (workspaceId && hasValidDatabaseUrl) {
          await db
            .from('workspaces')
            .update({
              gr_customer_email: email ?? null,
              gr_subscription_id: subscriptionId ?? null,
              gr_subscription_manage_url: deriveManageUrl(subscriptionId),
              plan,
            })
            .eq('id', workspaceId)
          trackBillingEvent('webhook.sale.applied', {
            workspaceId,
            plan,
            subscriptionId: subscriptionId ?? null,
          })
          // Fire welcome email via Inngest. Non-blocking; failure to emit
          // won't fail the ping ack.
          if (email) {
            try {
              await inngest.send({
                name: EVENTS.BILLING_WELCOME,
                data: { email, workspaceId, plan, subscriptionId: subscriptionId ?? null },
              })
            } catch {
              /* swallow — Inngest queue is best-effort */
            }
          }
        }
        break
      }

      case 'subscription_updated': {
        // Plan change or billing-period change. Gumroad sends the new
        // variant / recurrence via `new_plan` / `new_variants` — we just
        // refresh the manage URL and leave plan mapping for the next sale
        // ping (the safest signal).
        if (hasValidDatabaseUrl && subscriptionId) {
          await db
            .from('workspaces')
            .update({
              gr_subscription_manage_url: deriveManageUrl(subscriptionId),
              updated_at: new Date().toISOString(),
            })
            .eq('gr_subscription_id', subscriptionId)
          trackBillingEvent('webhook.subscription.updated', { subscriptionId })
        }
        break
      }

      case 'subscription_ended':
      case 'subscription_cancelled':
      case 'cancellation': {
        // Subscription terminated — revert to free tier.
        if (hasValidDatabaseUrl && subscriptionId) {
          await db
            .from('workspaces')
            .update({ plan: 'free', gr_subscription_id: null })
            .eq('gr_subscription_id', subscriptionId)
          trackBillingEvent('webhook.subscription.cancelled', { subscriptionId, resource })
        }
        break
      }

      case 'subscription_restarted': {
        // Buyer restarted a previously-cancelled subscription. We don't know
        // the original plan here — leave plan unchanged; next `sale` ping
        // (first renewal charge) will re-stamp it.
        if (hasValidDatabaseUrl && subscriptionId) {
          await db
            .from('workspaces')
            .update({
              gr_subscription_manage_url: deriveManageUrl(subscriptionId),
              updated_at: new Date().toISOString(),
            })
            .eq('gr_subscription_id', subscriptionId)
          trackBillingEvent('webhook.subscription.updated', { subscriptionId, restarted: true })
        }
        break
      }

      case 'refunded':
      case 'dispute': {
        // Treat refund / dispute as an immediate downgrade.
        if (hasValidDatabaseUrl && subscriptionId) {
          await db
            .from('workspaces')
            .update({ plan: 'free', gr_subscription_id: null })
            .eq('gr_subscription_id', subscriptionId)
          trackBillingEvent(
            resource === 'refunded' ? 'webhook.subscription.refunded' : 'webhook.subscription.disputed',
            { subscriptionId }
          )
        }
        break
      }

      default:
        // Unknown resource — acknowledge so Gumroad stops retrying.
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Gumroad webhook processing error:', err)
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 })
  }
}
