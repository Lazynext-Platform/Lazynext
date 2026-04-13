// Lemon Squeezy variant IDs — update with real values after creating products in LS dashboard
export const PLANS = {
  free: { name: 'Free', variantId: null },
  starter: {
    name: 'Starter',
    monthly: process.env.LEMONSQUEEZY_STARTER_MONTHLY_ID ?? '',
    yearly: process.env.LEMONSQUEEZY_STARTER_YEARLY_ID ?? '',
  },
  pro: {
    name: 'Pro',
    monthly: process.env.LEMONSQUEEZY_PRO_MONTHLY_ID ?? '',
    yearly: process.env.LEMONSQUEEZY_PRO_YEARLY_ID ?? '',
  },
  business: {
    name: 'Business',
    monthly: process.env.LEMONSQUEEZY_BUSINESS_MONTHLY_ID ?? '',
    yearly: process.env.LEMONSQUEEZY_BUSINESS_YEARLY_ID ?? '',
  },
} as const

export type PlanId = keyof typeof PLANS

export function getVariantId(planId: PlanId, interval: 'monthly' | 'yearly'): string {
  if (planId === 'free') throw new Error('Free plan has no variant ID')
  const id = PLANS[planId][interval]
  if (!id) throw new Error(`Missing LEMONSQUEEZY_${planId.toUpperCase()}_${interval.toUpperCase()}_ID env var`)
  return id
}
