'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'
import { PLAN_PRICING_USD, PLAN_PRICING_USD_ANNUAL } from '@/lib/utils/constants'

type BillingCycle = 'monthly' | 'annual'

// Landing-page pricing preview. Source of truth is /pricing — these tiers
// are kept consistent via PLAN_PRICING_USD constants. If you change prices,
// do it in lib/utils/constants.ts and both surfaces update.
const tiers = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    period: '/forever',
    desc: 'For individuals exploring Decision DNA.',
    cta: 'Start Free',
    ctaLink: '/sign-up',
    featured: false,
    features: [
      { name: '3 team members', included: true },
      { name: '20 decisions', included: true },
      { name: '100 nodes', included: true },
      { name: '20 AI queries/day', included: true },
      { name: 'Decision Health Dashboard', included: false },
      { name: 'PULSE + Automation', included: false },
    ],
  },
  {
    name: 'Team',
    monthlyPrice: PLAN_PRICING_USD.starter,
    annualPrice: PLAN_PRICING_USD_ANNUAL.starter,
    period: '/seat/month',
    desc: 'Small teams shipping fast. Decision Health included.',
    cta: 'Start 30-Day Trial',
    ctaLink: '/sign-up',
    featured: true,
    features: [
      { name: 'Unlimited members & nodes', included: true },
      { name: 'Unlimited decisions', included: true },
      { name: 'Decision Health Dashboard', included: true },
      { name: '100 AI queries/day/seat', included: true },
      { name: 'Import from Notion/Linear/Trello', included: true },
      { name: 'PULSE + Automation', included: false },
    ],
  },
  {
    name: 'Business',
    monthlyPrice: PLAN_PRICING_USD.pro,
    annualPrice: PLAN_PRICING_USD_ANNUAL.pro,
    period: '/seat/month',
    desc: 'Teams that decide on purpose. Full stack.',
    cta: 'Start 30-Day Trial',
    ctaLink: '/sign-up',
    featured: false,
    features: [
      { name: 'Everything in Team', included: true },
      { name: 'PULSE + Automation engine', included: true },
      { name: 'Outcome tracking & trends', included: true },
      { name: 'Semantic search + weekly digest', included: true },
      { name: '500 AI queries/day/seat', included: true },
      { name: 'Priority support', included: true },
    ],
  },
]

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const currency = useUIStore((s) => s.currency)

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Start free. Scale when you&apos;re ready.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'annual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Annual{' '}
              <span className="ml-1 text-xs font-bold text-green-600">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`card-hover rounded-2xl p-8 ${
                tier.featured
                  ? 'relative bg-brand text-white shadow-xl shadow-brand/20 ring-2 ring-brand'
                  : 'border border-slate-200 bg-white'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3B5AE0] px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-bold">{tier.name}</h3>

              <div className="mt-4">
                <span className="text-4xl font-extrabold">
                  {formatPrice(
                    billing === 'monthly' ? tier.monthlyPrice : tier.annualPrice,
                    currency
                  )}
                </span>
                <span
                  className={`text-sm ${
                    tier.featured ? 'text-white/70' : 'text-slate-500'
                  }`}
                >
                  {tier.period}
                </span>
              </div>

              <p
                className={`mt-2 text-sm ${
                  tier.featured ? 'text-white/70' : 'text-slate-500'
                }`}
              >
                {tier.desc}
              </p>

              <Link
                href={tier.ctaLink}
                className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                  tier.featured
                    ? 'bg-white text-brand hover:bg-slate-50'
                    : 'border-2 border-slate-200 text-slate-700 hover:border-brand hover:text-brand'
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-8 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f.name}
                    className={`flex items-center gap-2 text-sm ${
                      !f.included && !tier.featured
                        ? 'text-slate-400'
                        : tier.featured
                          ? 'text-white'
                          : 'text-slate-600'
                    }`}
                  >
                    {f.included ? (
                      <Check
                        className={`h-4 w-4 flex-shrink-0 ${
                          tier.featured ? 'text-green-300' : 'text-green-500'
                        }`}
                      />
                    ) : (
                      <X className="h-4 w-4 flex-shrink-0 text-slate-300" />
                    )}
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
