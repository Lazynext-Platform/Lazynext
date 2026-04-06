// Stripe price IDs — update with real values after creating products in Stripe dashboard
export const PLANS = {
  free: { name: 'Free', priceId: null },
  starter: {
    name: 'Starter',
    monthly: process.env.STRIPE_STARTER_MONTHLY_ID ?? '',
    yearly: process.env.STRIPE_STARTER_YEARLY_ID ?? '',
  },
  pro: {
    name: 'Pro',
    monthly: process.env.STRIPE_PRO_MONTHLY_ID ?? '',
    yearly: process.env.STRIPE_PRO_YEARLY_ID ?? '',
  },
  business: {
    name: 'Business',
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_ID ?? '',
    yearly: process.env.STRIPE_BUSINESS_YEARLY_ID ?? '',
  },
} as const

export type PlanId = keyof typeof PLANS
