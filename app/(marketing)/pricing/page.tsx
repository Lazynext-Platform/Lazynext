import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'For individuals and tiny teams getting started.',
    features: [
      'Up to 3 members',
      '5 workflows',
      '100 nodes',
      '20 AI queries/month',
      'All 7 primitives',
      'Community support',
    ],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₹499',
    period: '/seat/month',
    desc: 'For small teams who need more room to grow.',
    features: [
      'Up to 10 members',
      '25 workflows',
      '1,000 nodes',
      '100 AI queries/month',
      'Priority support',
      'Template marketplace',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹999',
    period: '/seat/month',
    desc: 'For teams serious about decision-making.',
    features: [
      'Up to 25 members',
      '100 workflows',
      '10,000 nodes',
      '500 AI queries/month',
      'Automations',
      'Weekly decision digest',
      'Advanced integrations',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Business',
    price: '₹2,999',
    period: '/seat/month',
    desc: 'For organizations that need Decision DNA analytics.',
    features: [
      'Up to 100 members',
      'Unlimited workflows',
      'Unlimited nodes',
      'Unlimited AI queries',
      'Decision Health Dashboard',
      'Semantic search',
      'Audit log',
      'SSO (coming soon)',
      'Custom fields',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <main className="py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            Simple pricing. No surprises.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Start free. Upgrade when your team grows. Cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-[#4F6EF7] bg-white shadow-lg shadow-blue-500/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#4F6EF7] px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>

              <Link
                href="/sign-up"
                className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-[#4F6EF7] text-white hover:bg-[#3D5BD4]'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
