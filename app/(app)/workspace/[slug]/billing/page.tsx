'use client'

import { useState } from 'react'
import {
  CreditCard,
  Check,
  Download,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    features: ['3 members', '5 workflows', '100 nodes', '10 AI queries/day', '100MB storage'],
    current: false,
    cta: 'Downgrade',
    ctaDisabled: true,
    accent: 'border-slate-600',
  },
  {
    name: 'Starter',
    price: '$9',
    period: '/seat/month',
    features: ['10 members', '25 workflows', '1,000 nodes', '50 AI queries/day', '5GB storage', 'Email support'],
    current: true,
    cta: 'Current Plan',
    ctaDisabled: true,
    accent: 'border-brand',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/seat/month',
    features: ['50 members', 'Unlimited workflows', 'Unlimited nodes', '200 AI queries/day', '50GB storage', 'Priority support', 'Advanced analytics', 'API access'],
    current: false,
    cta: 'Upgrade',
    ctaDisabled: false,
    accent: 'border-emerald-500',
  },
  {
    name: 'Business',
    price: '$49',
    period: '/seat/month',
    features: ['Unlimited members', 'Unlimited everything', '1000 AI queries/day', '500GB storage', 'SSO/SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    current: false,
    cta: 'Upgrade',
    ctaDisabled: false,
    accent: 'border-amber-500',
  },
]

const billingHistory = [
  { date: 'Apr 1, 2026', desc: 'Starter Plan — 3 seats', amount: '$27', status: 'Paid' },
  { date: 'Mar 1, 2026', desc: 'Starter Plan — 3 seats', amount: '$27', status: 'Paid' },
  { date: 'Feb 1, 2026', desc: 'Starter Plan — 2 seats', amount: '$18', status: 'Paid' },
  { date: 'Jan 15, 2026', desc: 'Starter Plan — Trial', amount: '$0', status: 'Trial' },
]

const usage = [
  { label: 'Nodes Used', value: 342, limit: 1000, color: 'bg-brand' },
  { label: 'Decisions Logged', value: 47, limit: 500, color: 'bg-emerald-500' },
  { label: 'LazyMind Queries Today', value: 23, limit: 50, color: 'bg-amber-500' },
  { label: 'File Storage', value: 1.2, limit: 5, unit: 'GB', color: 'bg-violet-500' },
]

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Link href={`/workspace/${slug}/settings`} className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
        <ArrowLeft className="h-3 w-3" /> Back to settings
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <CreditCard className="h-6 w-6 text-brand" />
        Billing & Subscription
      </h1>
      <p className="mt-1 text-sm text-slate-400">Manage your subscription, payment methods, and usage.</p>

      {/* Current Plan */}
      <div className="mt-6 rounded-xl border-2 border-brand bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100">Starter Plan</h2>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">Current Plan</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">$9/seat/month · 3 seats · Next billing: May 1, 2026</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Manage Subscription</button>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Change Plan</button>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Compare Plans</h2>
          <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button onClick={() => setBillingCycle('monthly')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'monthly' ? 'bg-brand text-white' : 'text-slate-400')}>Monthly</button>
            <button onClick={() => setBillingCycle('annual')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'annual' ? 'bg-brand text-white' : 'text-slate-400')}>Annual <span className="text-emerald-400">-20%</span></button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={cn('rounded-xl border-2 bg-slate-900 p-5 transition-all relative', plan.current ? plan.accent : 'border-slate-800 hover:border-slate-600')}>
              {plan.current && <span className="absolute -top-3 left-4 rounded-full bg-brand px-3 py-0.5 text-2xs font-bold text-white">Current Plan</span>}
              <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-slate-50">{billingCycle === 'annual' && plan.price !== '$0' ? `$${Math.round(parseInt(plan.price.replace(/[$,]/g, '')) * 0.8)}` : plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                    <Check className="h-3 w-3 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button disabled={plan.ctaDisabled} className={cn('mt-5 w-full rounded-lg py-2 text-sm font-semibold transition-colors', plan.current ? 'bg-slate-800 text-slate-400 cursor-default' : plan.ctaDisabled ? 'border border-slate-700 text-slate-500 cursor-default' : 'bg-brand text-white hover:bg-brand-hover')}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Payment Method</h2>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-12 items-center justify-center rounded bg-white text-2xs font-bold text-blue-600">VISA</div>
            <div>
              <p className="text-sm text-slate-200">•••• •••• •••• 4242</p>
              <p className="text-xs text-slate-500">Expires 12/2027</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-400">Default</span>
          </div>
          <div className="flex gap-2">
            <button className="text-xs text-brand hover:text-brand-hover">Update</button>
            <button className="text-xs text-slate-500 hover:text-slate-300">Add UPI</button>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Billing History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500">
                <th className="py-2 text-left font-medium">Date</th>
                <th className="py-2 text-left font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="py-2 text-center font-medium">Status</th>
                <th className="py-2 text-right font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((h, i) => (
                <tr key={i} className="border-b border-slate-800/50 last:border-0">
                  <td className="py-3 text-slate-400">{h.date}</td>
                  <td className="py-3 text-slate-200">{h.desc}</td>
                  <td className="py-3 text-right text-slate-200">{h.amount}</td>
                  <td className="py-3 text-center">
                    <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', h.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400')}>{h.status}</span>
                  </td>
                  <td className="py-3 text-right"><button className="text-xs text-brand hover:text-brand-hover"><Download className="inline h-3 w-3" /> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Usage</h2>
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {usage.map((u) => (
            <div key={u.label} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{u.label}</span>
                <span className="text-xs text-slate-400">{u.value}{u.unit ? u.unit : ''} / {u.limit}{u.unit ? u.unit : ''}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-700', u.color)} style={{ width: `${(u.value / u.limit) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
