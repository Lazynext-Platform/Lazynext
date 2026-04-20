'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'

type BillingCycle = 'monthly' | 'annual'

// Gumroad product URLs — set these as Vercel env vars once your Gumroad products are live.
// When unset, buttons fall back to /sign-up (users join free, upgrade later).
const GUMROAD_URLS = {
  starterMonthly: process.env.NEXT_PUBLIC_GUMROAD_STARTER_MONTHLY_URL,
  starterAnnual: process.env.NEXT_PUBLIC_GUMROAD_STARTER_ANNUAL_URL,
  proMonthly: process.env.NEXT_PUBLIC_GUMROAD_PRO_MONTHLY_URL,
  proAnnual: process.env.NEXT_PUBLIC_GUMROAD_PRO_ANNUAL_URL,
  businessMonthly: process.env.NEXT_PUBLIC_GUMROAD_BUSINESS_MONTHLY_URL,
  businessAnnual: process.env.NEXT_PUBLIC_GUMROAD_BUSINESS_ANNUAL_URL,
} as const

const tiers = [
  {
    name: 'Free',
    slug: 'free' as const,
    desc: 'For individuals getting started',
    monthlyPrice: '0',
    annualPrice: '0',
    monthlyUsd: 'Free forever',
    annualUsd: 'Free forever',
    cta: 'Start Free',
    ctaLink: '/sign-up',
    ctaStyle: 'outline' as const,
    highlighted: false,
    features: [
      '1 workspace',
      '3 members max',
      '50 nodes per workspace',
      '10 decisions',
      'Basic LazyMind (10 queries/day)',
      'Community support',
    ],
  },
  {
    name: 'Starter',
    slug: 'starter' as const,
    desc: 'For small teams shipping fast',
    monthlyPrice: '9',
    annualPrice: '7',
    monthlyUsd: null as string | null,
    annualUsd: null as string | null,
    cta: 'Start Free Trial',
    ctaLink: '/sign-up',
    ctaStyle: 'filled' as const,
    highlighted: true,
    inheritLabel: 'Everything in Free, plus:',
    features: [
      'Unlimited workspaces',
      'Unlimited members',
      'Unlimited nodes',
      '100 decisions/workspace',
      'Decision DNA search',
      'Full LazyMind AI (100 queries/day)',
      'Email support',
      'Import from Notion/Linear/Trello',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro' as const,
    desc: 'For teams that need the full picture',
    monthlyPrice: '19',
    annualPrice: '15',
    monthlyUsd: null as string | null,
    annualUsd: null as string | null,
    cta: 'Start Free Trial',
    ctaLink: '/sign-up',
    ctaStyle: 'filled' as const,
    highlighted: false,
    inheritLabel: 'Everything in Starter, plus:',
    features: [
      'Unlimited decisions',
      'Decision Health Dashboard',
      'Decision quality analytics',
      'Outcome tracking & trends',
      'PULSE dashboards',
      'Automation engine',
      'Priority support',
      'Custom templates',
      'Data export (JSON/CSV)',
    ],
  },
  {
    name: 'Business',
    slug: 'business' as const,
    desc: 'For organizations at scale',
    monthlyPrice: '49',
    annualPrice: '39',
    monthlyUsd: null as string | null,
    annualUsd: null as string | null,
    cta: 'Contact Sales',
    ctaLink: '/sign-up',
    ctaStyle: 'outline' as const,
    highlighted: false,
    inheritLabel: 'Everything in Pro, plus:',
    features: [
      'SSO / SAML',
      'Advanced admin controls',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Audit logs',
      'Unlimited LazyMind queries',
    ],
  },
]

const comparisonFeatures = [
  { name: 'Workspaces', free: '1', starter: 'Unlimited', pro: 'Unlimited', business: 'Unlimited' },
  { name: 'Members', free: '3', starter: 'Unlimited', pro: 'Unlimited', business: 'Unlimited' },
  { name: 'Nodes', free: '50', starter: 'Unlimited', pro: 'Unlimited', business: 'Unlimited' },
  { name: 'Decisions', free: '10', starter: '100/workspace', pro: 'Unlimited', business: 'Unlimited' },
  { name: 'Decision DNA Search', free: null, starter: true, pro: true, business: true },
  { name: 'Quality Scores', free: null, starter: null, pro: true, business: true },
  { name: 'Outcome Tracking', free: null, starter: null, pro: true, business: true },
  { name: 'Health Dashboard', free: null, starter: null, pro: true, business: true },
  { name: 'LazyMind AI queries', free: '10/day', starter: '100/day', pro: '100/day', business: 'Unlimited' },
  { name: 'PULSE', free: null, starter: null, pro: true, business: true },
  { name: 'Automation', free: null, starter: null, pro: true, business: true },
  { name: 'Import', free: null, starter: true, pro: true, business: true },
  { name: 'Export', free: null, starter: null, pro: 'JSON/CSV', business: 'JSON/CSV' },
  { name: 'Templates', free: null, starter: null, pro: 'Custom', business: 'Custom' },
  { name: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', business: 'Dedicated' },
  { name: 'SSO', free: null, starter: null, pro: null, business: true },
]

const faqItems = [
  {
    q: 'Can I try before I buy?',
    a: 'Yes! Every paid plan comes with a free 14-day Pro trial. No credit card required to get started. Explore every feature risk-free, then pick the plan that fits your team.',
  },
  {
    q: 'How does per-seat pricing work?',
    a: 'Each team member who accesses Lazynext counts as one seat. You only pay for the seats you use. Add or remove seats anytime, and your bill adjusts automatically on the next cycle.',
  },
  {
    q: 'Can I switch plans?',
    a: "Absolutely. You can upgrade or downgrade your plan at any time from your Workspace Settings. When you upgrade, you get immediate access to new features. When you downgrade, the change takes effect at the end of your current billing period.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We process payments through Gumroad, which supports credit/debit cards (Visa, Mastercard, Amex), PayPal, and other local payment methods worldwide. All pricing is in USD with automatic tax handling.',
  },
  {
    q: 'Is there a discount for startups?',
    a: "Yes! We have a startup program offering discounted rates for early-stage teams. Contact us at hello@lazynext.com with your company details and we'll get you set up.",
  },
  {
    q: 'What happens when I hit the free plan limit?',
    a: "You won't lose any data. When you reach a limit, you'll see a friendly upgrade prompt with options to move to a paid plan. Your existing work stays intact and accessible — you just can't create new items beyond the limit until you upgrade.",
  },
]

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || 'mx-auto h-5 w-5 text-brand'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function renderCellValue(val: string | boolean | null) {
  if (val === true) return <CheckIcon />
  if (val === null) return <span className="text-slate-400">&mdash;</span>
  return <span>{val}</span>
}

type PricingTier = (typeof tiers)[number]

function PricingCta({ tier, isAnnual }: { tier: PricingTier; isAnnual: boolean }) {
  // For paid tiers, prefer the Gumroad checkout URL when configured.
  let href: string = tier.ctaLink
  let external = false
  if (tier.slug === 'starter') {
    const url = isAnnual ? GUMROAD_URLS.starterAnnual : GUMROAD_URLS.starterMonthly
    if (url) { href = url; external = true }
  } else if (tier.slug === 'pro') {
    const url = isAnnual ? GUMROAD_URLS.proAnnual : GUMROAD_URLS.proMonthly
    if (url) { href = url; external = true }
  } else if (tier.slug === 'business') {
    const url = isAnnual ? GUMROAD_URLS.businessAnnual : GUMROAD_URLS.businessMonthly
    if (url) { href = url; external = true }
  }

  const className = `mt-8 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
    tier.ctaStyle === 'filled'
      ? 'bg-brand text-white shadow-sm hover:bg-brand-hover'
      : 'border-2 border-brand bg-white text-brand hover:bg-brand/5'
  }`

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {tier.cta}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {tier.cta}
    </Link>
  )
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const currency = useUIStore((s) => s.currency)

  const isAnnual = billing === 'annual'

  return (
    <main id="main-content">
      {/* PRICING HERO */}
      <section className="pb-10 pt-20 sm:pb-14 sm:pt-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500 sm:text-xl">
            Start free. Upgrade when you&apos;re ready. No credit card required.
          </p>
        </div>
      </section>

      {/* BILLING TOGGLE */}
      <section className="pb-12">
        <div className="flex items-center justify-center gap-3">
          <span
            className={`text-sm font-semibold ${
              !isAnnual ? 'text-slate-900' : 'text-slate-500'
            }`}
          >
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={isAnnual ? 'true' : 'false'}
            aria-label="Toggle annual billing"
            onClick={() => setBilling(isAnnual ? 'monthly' : 'annual')}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              isAnnual ? 'bg-brand' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              isAnnual ? 'font-semibold text-slate-900' : 'text-slate-500'
            }`}
          >
            Annual
          </span>
          <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            Save 17%
          </span>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl bg-white p-7 ${
                  tier.highlighted
                    ? 'border-2 border-brand shadow-lg shadow-brand/10'
                    : 'border border-slate-200'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-brand px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{tier.desc}</p>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      {formatPrice(parseInt(isAnnual ? tier.annualPrice : tier.monthlyPrice), currency)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {tier.monthlyPrice === '0' ? '/month' : '/seat/month'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {isAnnual && tier.monthlyPrice !== '0' && (
                      <span>billed annually</span>
                    )}
                    {!isAnnual && tier.monthlyPrice !== '0' && (
                      <span>billed monthly</span>
                    )}
                    {tier.monthlyPrice === '0' && 'Free forever'}
                  </p>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {tier.inheritLabel && (
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0 text-sm font-semibold text-brand">
                        +
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {tier.inheritLabel}
                      </span>
                    </li>
                  )}
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <span className="text-sm text-slate-600">{f}</span>
                    </li>
                  ))}
                </ul>

                <PricingCta tier={tier} isAnnual={isAnnual} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON TABLE */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Compare all features
          </h2>

          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm" aria-label="Plan feature comparison">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th scope="col" className="w-1/5 px-4 py-4 text-left font-semibold text-slate-500">
                    Feature
                  </th>
                  <th scope="col" className="w-1/5 px-4 py-4 text-center font-semibold text-slate-900">
                    Free
                  </th>
                  <th scope="col" className="w-1/5 px-4 py-4 text-center font-semibold text-brand">
                    Starter
                    <span className="block text-xs font-normal text-brand/70">
                      Most Popular
                    </span>
                  </th>
                  <th scope="col" className="w-1/5 px-4 py-4 text-center font-semibold text-slate-900">
                    Pro
                  </th>
                  <th scope="col" className="w-1/5 px-4 py-4 text-center font-semibold text-slate-900">
                    Business
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {row.name}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {renderCellValue(row.free)}
                    </td>
                    <td className="bg-brand/[0.03] px-4 py-3.5 text-center text-slate-600">
                      {renderCellValue(row.starter)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {renderCellValue(row.pro)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-600">
                      {renderCellValue(row.business)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="bg-slate-50 pb-20">
        <div className="mx-auto max-w-3xl px-6 pt-20">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Frequently asked questions
          </h2>

          <div className="space-y-3">
            {faqItems.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                    aria-expanded={isOpen ? 'true' : 'false'}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span className="pr-4 text-base font-semibold text-slate-900">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-52' : 'max-h-0'
                    }`}
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                      {faq.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Still have questions?
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            We&apos;re happy to help you find the right plan for your team.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
            >
              Talk to Us
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Or start free &mdash; no credit card required.
          </p>
        </div>
      </section>
    </main>
  )
}
