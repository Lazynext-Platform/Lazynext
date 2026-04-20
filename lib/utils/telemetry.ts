/**
 * Billing funnel telemetry.
 *
 * Emits structured single-line JSON logs on every billing-related event.
 * Vercel (and any log aggregator) captures stdout — so you get queryable
 * funnel data with zero extra infra: what gate variant shows most, which
 * converts, which drops off, webhook error rates, etc.
 *
 * When PostHog / Supabase event tables are wired in, swap the emitter
 * implementation and every call site keeps working.
 */

export type BillingEvent =
  // Paywall + modal
  | 'paywall.gate.shown' // FeatureGate rendered the lock card
  | 'paywall.modal.opened' // UpgradeModal mounted with a variant
  | 'paywall.checkout.clicked' // User clicked Choose <Plan>
  | 'paywall.checkout.succeeded' // /api/v1/billing/checkout returned a URL
  | 'paywall.checkout.errored' // /api/v1/billing/checkout 4xx/5xx
  | 'paywall.contact.clicked' // Enterprise tier → /contact
  // Webhook — logged server-side
  | 'webhook.ping.received'
  | 'webhook.ping.duplicate'
  | 'webhook.ping.unauthorized'
  | 'webhook.sale.applied'
  | 'webhook.subscription.cancelled'
  | 'webhook.subscription.refunded'
  | 'webhook.subscription.disputed'
  | 'webhook.subscription.updated'
  // Cron
  | 'cron.trial.expired'

export type BillingEventProps = Record<string, string | number | boolean | null | undefined>

/**
 * Emit a structured event. Safe to call from server or client routes.
 * Prefixes every line with `BILLING_EVENT` so log filtering is trivial:
 *
 *   grep BILLING_EVENT logs | jq 'select(.event | startswith("paywall"))'
 */
/**
 * In-memory dedupe window. Same (event + key) within DEDUPE_WINDOW_MS
 * emits once. Prevents a user spamming "Add node" against a hit cap
 * from flooding logs with hundreds of paywall.gate.shown events.
 *
 * Key defaults to JSON.stringify(props) when not supplied via the
 * `_dedupeKey` prop. Purely process-local — server and each browser
 * tab have their own windows, which is the right granularity (a reload
 * should re-emit so you can see the user hit the gate again).
 */
const DEDUPE_WINDOW_MS = 10_000
const recentEmits = new Map<string, number>()

function shouldDedupe(event: BillingEvent, props: BillingEventProps): boolean {
  // Webhook + cron events are always emitted — server-side, one per ping.
  if (event.startsWith('webhook.') || event.startsWith('cron.')) return false

  const key =
    typeof props._dedupeKey === 'string'
      ? props._dedupeKey
      : `${event}:${props.variant ?? ''}:${props.plan ?? ''}`
  const now = Date.now()
  const last = recentEmits.get(key)
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return true

  recentEmits.set(key, now)
  // Bound the map so it can't grow unbounded in a long-running session.
  if (recentEmits.size > 256) {
    const cutoff = now - DEDUPE_WINDOW_MS
    for (const [k, t] of recentEmits) {
      if (t < cutoff) recentEmits.delete(k)
    }
  }
  return false
}

export function trackBillingEvent(event: BillingEvent, props: BillingEventProps = {}): void {
  if (shouldDedupe(event, props)) return
  const { _dedupeKey: _omit, ...rest } = props
  const payload = {
    type: 'BILLING_EVENT',
    event,
    ts: new Date().toISOString(),
    ...rest,
  }
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload))
  } catch {
    // JSON.stringify shouldn't throw for our shape, but never let
    // telemetry break a request.
  }
}
