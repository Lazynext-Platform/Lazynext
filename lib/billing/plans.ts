// Gumroad product URLs — set once products exist in the Gumroad dashboard.
// Each plan is a recurring (subscription/membership) product on Gumroad.
// The pricing page reads the NEXT_PUBLIC_* variants for direct links; the
// API checkout route reads the server-side variants below for programmatic
// redirects.
export const PLANS = {
  free: { name: 'Free', monthly: null, yearly: null },
  starter: {
    name: 'Starter',
    monthly:
      process.env.GUMROAD_STARTER_MONTHLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL ??
      '',
    yearly:
      process.env.GUMROAD_STARTER_YEARLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL ??
      '',
  },
  pro: {
    name: 'Pro',
    monthly:
      process.env.GUMROAD_PRO_MONTHLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL ??
      '',
    yearly:
      process.env.GUMROAD_PRO_YEARLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL ??
      '',
  },
  business: {
    name: 'Business',
    monthly:
      process.env.GUMROAD_BUSINESS_MONTHLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_BUSINESS_MONTHLY_URL ??
      '',
    yearly:
      process.env.GUMROAD_BUSINESS_YEARLY_URL ??
      process.env.NEXT_PUBLIC_GUMROAD_BUSINESS_ANNUAL_URL ??
      '',
  },
} as const

export type PlanId = keyof typeof PLANS

export function getProductUrl(planId: PlanId, interval: 'monthly' | 'yearly'): string {
  if (planId === 'free') throw new Error('Free plan has no checkout URL')
  const url = PLANS[planId][interval]
  if (!url) {
    throw new Error(
      `Missing GUMROAD_${planId.toUpperCase()}_${interval.toUpperCase()}_URL env var`
    )
  }
  return url
}

/**
 * Append custom URL params so Gumroad echoes them back on the webhook ping
 * as `url_params[key]`. We use this to correlate a sale with the buyer's
 * workspace + plan without trusting the buyer-supplied email alone.
 */
export function buildCheckoutUrl(
  baseUrl: string,
  params: { workspaceId: string; userId: string; plan: PlanId; interval: 'monthly' | 'yearly' }
): string {
  const url = new URL(baseUrl)
  url.searchParams.set('wanted', 'true')
  url.searchParams.set('workspace_id', params.workspaceId)
  url.searchParams.set('user_id', params.userId)
  url.searchParams.set('plan', params.plan)
  url.searchParams.set('interval', params.interval)
  return url.toString()
}
