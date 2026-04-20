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
export function trackBillingEvent(event: BillingEvent, props: BillingEventProps = {}): void {
  const payload = {
    type: 'BILLING_EVENT',
    event,
    ts: new Date().toISOString(),
    ...props,
  }
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload))
  } catch {
    // JSON.stringify shouldn't throw for our shape, but never let
    // telemetry break a request.
  }
}
