'use client'

import { useState } from 'react'
import { X, Lock, Sparkles, Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'

type ModalVariant = 'node-limit' | 'ai-limit' | 'health-gate' | 'full-upgrade'

const plans = [
  { name: 'Starter', price: 9, period: '/seat/mo', features: ['10 members', '1,000 nodes', '50 AI/day'], accent: 'border-brand', popular: false },
  { name: 'Pro', price: 19, period: '/seat/mo', features: ['50 members', 'Unlimited nodes', '200 AI/day', 'Analytics'], accent: 'border-emerald-500', popular: true },
  { name: 'Business', price: 49, period: '/seat/mo', features: ['Unlimited', 'SSO/SAML', '1000 AI/day', 'SLA'], accent: 'border-purple-500/30', popular: false },
]

export function UpgradeModal({ variant = 'full-upgrade', onClose }: { variant?: ModalVariant; onClose: () => void }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const currency = useUIStore((s) => s.currency)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl mx-3 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              {variant === 'node-limit' ? 'Node Limit Reached' :
               variant === 'ai-limit' ? 'AI Query Limit Reached' :
               variant === 'health-gate' ? 'Unlock Decision Health' :
               'Upgrade Your Plan'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5">
          {/* Limit context */}
          {variant !== 'full-upgrade' && (
            <div className={cn('mb-5 rounded-lg border p-4', variant === 'ai-limit' ? 'border-amber-500/20 bg-amber-500/5' : 'border-brand/20 bg-brand/5')}>
              {variant === 'node-limit' && (
                <div>
                  <p className="text-sm text-slate-200">You&apos;ve used <strong className="text-white">100/100</strong> nodes on the Free plan.</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-800"><div className="h-2 w-full rounded-full bg-red-500" /></div>
                  <p className="mt-1 text-xs text-slate-500">Upgrade to create unlimited nodes.</p>
                </div>
              )}
              {variant === 'ai-limit' && (
                <div>
                  <p className="text-sm text-slate-200">You&apos;ve used <strong className="text-amber-400">10/10</strong> LazyMind AI queries today.</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-800"><div className="h-2 w-full rounded-full bg-amber-500" /></div>
                  <p className="mt-1 text-xs text-slate-500">Resets tomorrow, or upgrade for more queries.</p>
                </div>
              )}
              {variant === 'health-gate' && (
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-brand" />
                  <div>
                    <p className="text-sm text-slate-200">Decision Health Dashboard is a <strong className="text-brand">Business</strong> feature.</p>
                    <p className="mt-0.5 text-xs text-slate-500">Get deep analytics on your team&apos;s decision quality.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex justify-center mb-4">
            <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
              <button onClick={() => setBillingCycle('monthly')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'monthly' ? 'bg-brand text-white' : 'text-slate-400')}>Monthly</button>
              <button onClick={() => setBillingCycle('annual')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'annual' ? 'bg-brand text-white' : 'text-slate-400')}>Annual <span className="text-emerald-400">-20%</span></button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div key={plan.name} className={cn('rounded-xl border-2 bg-slate-800 p-4 relative', plan.popular ? plan.accent : 'border-slate-700 hover:border-slate-600')}>
                {plan.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2.5 py-0.5 text-3xs font-bold text-white">Popular</span>}
                <h3 className="text-sm font-bold text-slate-100">{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-slate-50">
                    {formatPrice(billingCycle === 'annual' ? Math.round(plan.price * 0.8) : plan.price, currency)}
                  </span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400"><Check className="h-3 w-3 text-emerald-400" />{f}</li>
                  ))}
                </ul>
                <button className={cn('mt-4 w-full rounded-lg py-2 text-xs font-semibold transition-colors', plan.popular ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-slate-600 text-slate-300 hover:bg-slate-700')}>
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 px-6 py-3 flex justify-between items-center">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Maybe later</button>
          <p className="text-2xs text-slate-600">All plans include 14-day free trial</p>
        </div>
      </div>
    </div>
  )
}

export function TrialBanner({ daysLeft = 7 }: { daysLeft?: number }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-brand/20 bg-brand/5 px-4 py-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <span className="text-sm text-slate-200">Pro trial — <strong className="text-brand">{daysLeft} days left</strong></span>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover">Upgrade now</button>
        <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-slate-300"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}
