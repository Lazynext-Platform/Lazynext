'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

type BillingCycle = 'monthly' | 'annual'

const tiers = [
  {
    name: 'Free',
    monthlyPrice: '₹0',
    annualPrice: '₹0',
    period: '/month',
    desc: 'For individuals and small experiments.',
    cta: 'Get Started',
    ctaLink: '/sign-up',
    featured: false,
    features: [
      { name: '1 workspace', included: true },
      { name: '3 members', included: true },
      { name: '50 nodes', included: true },
      { name: '10 decisions', included: true },
      { name: 'LazyMind AI', included: false },
      { name: 'Decision DNA search', included: false },
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: '₹499',
    annualPrice: '₹415',
    period: '/seat/month',
    desc: 'For growing teams that ship fast.',
    cta: 'Start Free Trial',
    ctaLink: '/sign-up',
    featured: true,
    features: [
      { name: 'Unlimited workspaces', included: true },
      { name: 'Unlimited members', included: true },
      { name: 'Unlimited nodes', included: true },
      { name: 'Decision DNA search', included: true },
      { name: 'LazyMind AI', included: true },
      { name: 'Priority email support', included: true },
    ],
  },
  {
    name: 'Business',
    monthlyPrice: '₹999',
    annualPrice: '₹832',
    period: '/seat/month',
    desc: 'For orgs that need control and scale.',
    cta: 'Contact Sales',
    ctaLink: '/sign-up',
    featured: false,
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Decision Health Dashboard', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'Custom integrations', included: true },
    ],
  },
]

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-[1280px] px-6">
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
                Save 17%
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
                  ? 'relative bg-[#4F6EF7] text-white shadow-xl shadow-[#4F6EF7]/20 ring-2 ring-[#4F6EF7]'
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
                  {billing === 'monthly'
                    ? tier.monthlyPrice
                    : tier.annualPrice}
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
                    ? 'bg-white text-[#4F6EF7] hover:bg-slate-50'
                    : 'border-2 border-slate-200 text-slate-700 hover:border-[#4F6EF7] hover:text-[#4F6EF7]'
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
