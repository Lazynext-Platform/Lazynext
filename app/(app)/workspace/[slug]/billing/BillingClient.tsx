'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Check, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_LIMITS, PLAN_PRICING_USD } from '@/lib/utils/constants'
import type { BillingUsage } from '@/lib/data/workspace'

type Plan = keyof typeof PLAN_LIMITS

interface Props {
  slug: string
  workspaceId: string
  workspacePlan: Plan
  usage: BillingUsage
}

const PLAN_DISPLAY: Record<Plan, string> = {
  free: 'Free',
  starter: 'Team',
  pro: 'Business',
  business: 'Enterprise',
  enterprise: 'Enterprise',
}

// Plan card metadata. Prices are sourced from `PLAN_PRICING_USD` so a
// single bump there propagates everywhere; feature copy lives here
// because each card surfaces a curated 4-5 bullets, not the full
// feature matrix (that's the marketing pricing page's job).
const planMeta: Record<Plan, { period: string; features: string[]; accent: string }> = {
  free: {
    period: '/forever',
    features: ['1 workspace', '3 members', '5 workflows', '100 nodes', '20 decisions', '20 AI queries/day'],
    accent: 'border-slate-600',
  },
  starter: {
    period: '/seat/month',
    features: ['Unlimited members', 'Unlimited workflows', 'Unlimited nodes', 'Unlimited decisions', '100 AI queries/day/seat', 'Email support'],
    accent: 'border-brand',
  },
  pro: {
    period: '/seat/month',
    features: ['Everything in Team', 'Decision Health dashboard', 'Pulse', 'Automations', '500 AI queries/day/seat'],
    accent: 'border-emerald-500',
  },
  business: {
    period: '/seat/month',
    features: ['Everything in Business', 'SSO / SAML', 'Audit log', 'Custom fields', 'Unlimited AI queries', 'Dedicated support'],
    accent: 'border-amber-500',
  },
  enterprise: {
    period: '/seat/month',
    features: ['Everything in Business', 'SSO / SAML', 'Audit log', 'Custom fields', 'Unlimited AI queries', 'Dedicated support'],
    accent: 'border-amber-500',
  },
}

const PLAN_ORDER: Plan[] = ['free', 'starter', 'pro', 'business']

function pct(value: number, limit: number): number {
  if (limit < 0) return 0 // unlimited
  if (limit === 0) return 0
  return Math.min(100, Math.round((value / limit) * 100))
}

function formatLimit(limit: number): string {
  return limit < 0 ? '∞' : String(limit)
}

export function BillingClient({ slug, workspaceId, workspacePlan, usage }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const currency = useUIStore((s) => s.currency)
  const limits = PLAN_LIMITS[workspacePlan]
  const currentMeta = planMeta[workspacePlan]
  const currentPrice = PLAN_PRICING_USD[workspacePlan]

  // POST to /api/v1/billing/checkout, then redirect to the returned
  // Gumroad URL. Same shape as the global UpgradeModal so we get the
  // same telemetry events + error mapping.
  async function handleUpgrade(targetPlan: Exclude<Plan, 'free' | 'business' | 'enterprise'>) {
    setCheckoutError(null)
    setPendingPlan(targetPlan)
    trackBillingEvent('paywall.checkout.clicked', { plan: targetPlan, surface: 'billing-page' })
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: targetPlan,
          // Server schema accepts 'monthly' | 'yearly'; we expose
          // 'monthly' / 'annual' in the UI for consistency with the
          // marketing pricing page — translate at the boundary.
          interval: billingCycle === 'annual' ? 'yearly' : 'monthly',
          workspaceId,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { data?: { url?: string }; error?: string; message?: string }
      if (!res.ok || !body.data?.url) {
        const errorMessage = body.message || body.error || 'Checkout temporarily unavailable. Try again in a moment.'
        trackBillingEvent('paywall.checkout.errored', {
          plan: targetPlan,
          surface: 'billing-page',
          status: res.status,
          message: errorMessage,
        })
        setCheckoutError(errorMessage)
        setPendingPlan(null)
        return
      }
      trackBillingEvent('paywall.checkout.succeeded', {
        plan: targetPlan,
        surface: 'billing-page',
        interval: billingCycle === 'annual' ? 'yearly' : 'monthly',
      })
      window.location.href = body.data.url
    } catch {
      trackBillingEvent('paywall.checkout.errored', {
        plan: targetPlan,
        surface: 'billing-page',
        status: 0,
        message: 'network-error',
      })
      setCheckoutError('Network error. Check your connection and try again.')
      setPendingPlan(null)
    }
  }

  const usageRows = [
    { label: 'Nodes', value: usage.nodes, limit: limits.nodes, color: 'bg-brand' },
    { label: 'Members', value: usage.members, limit: limits.members, color: 'bg-emerald-500' },
    { label: 'Decisions logged', value: usage.decisions, limit: limits.decisions, color: 'bg-violet-500' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Link href={`/workspace/${slug}/settings`} className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
        <ArrowLeft className="h-3 w-3" /> Back to settings
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <CreditCard className="h-6 w-6 text-brand" />
        Billing &amp; Subscription
      </h1>
      <p className="mt-1 text-sm text-slate-400">Manage your subscription, payment methods, and usage.</p>

      {/* Current Plan */}
      <div className="mt-6 rounded-xl border-2 border-brand bg-slate-900 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100">{PLAN_DISPLAY[workspacePlan]} Plan</h2>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">Current Plan</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {currentPrice === 0
                ? 'Free forever · upgrade for unlimited nodes, workflows, decisions, and AI'
                : currentPrice === null
                  ? `Custom pricing · ${usage.members} ${usage.members === 1 ? 'seat' : 'seats'}`
                  : `${formatPrice(currentPrice, currency)}${currentMeta.period} · ${usage.members} ${usage.members === 1 ? 'seat' : 'seats'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="https://lazynext.gumroad.com/membership"
              target="_blank"
              rel="noopener"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Manage on Gumroad
            </Link>
            <button
              type="button"
              onClick={() => {
                trackBillingEvent('paywall.gate.shown', { variant: 'full-upgrade', plan: workspacePlan, surface: 'billing-page-header' })
                useUpgradeModal.getState().show('full-upgrade')
              }}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              Change Plan
            </button>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Compare Plans</h2>
          <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'monthly' ? 'bg-brand text-brand-foreground' : 'text-slate-400')}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium', billingCycle === 'annual' ? 'bg-brand text-brand-foreground' : 'text-slate-400')}
            >
              Annual <span className="text-emerald-400">-20%</span>
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((p) => {
            const meta = planMeta[p]
            const isCurrent = p === workspacePlan
            const display = PLAN_DISPLAY[p]
            const basePrice = PLAN_PRICING_USD[p]
            // `null` is the Enterprise / Business "contact sales" sentinel.
            // Render "Custom" for those tiers and skip the annual
            // discount math entirely.
            const isCustomPriced = basePrice === null
            const adjustedPrice =
              !isCustomPriced && billingCycle === 'annual' && basePrice !== 0
                ? Math.round(basePrice * 0.8)
                : basePrice
            return (
              <div
                key={p}
                className={cn(
                  'relative rounded-xl border-2 bg-slate-900 p-5 transition-all',
                  isCurrent ? meta.accent : 'border-slate-800 hover:border-slate-600',
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-4 rounded-full bg-brand px-3 py-0.5 text-2xs font-bold text-brand-foreground">
                    Current Plan
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-100">{display}</h3>
                <div className="mt-2">
                  {isCustomPriced ? (
                    <span className="text-2xl font-bold text-slate-50">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-slate-50">{formatPrice(adjustedPrice as number, currency)}</span>
                      <span className="text-sm text-slate-500">{meta.period}</span>
                    </>
                  )}
                </div>
                <ul className="mt-4 space-y-2">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <Check className="h-3 w-3 text-emerald-400" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent || pendingPlan !== null || isCustomPriced || p === 'free'}
                  onClick={() => {
                    if (isCustomPriced || p === 'business' || p === 'enterprise') {
                      // Enterprise tier routes to contact-sales — no
                      // Gumroad product to check out against.
                      window.location.href = '/contact?topic=enterprise'
                      return
                    }
                    if (p === 'starter' || p === 'pro') {
                      void handleUpgrade(p)
                    }
                  }}
                  className={cn(
                    'mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors',
                    isCurrent || p === 'free'
                      ? 'cursor-default bg-slate-800 text-slate-400'
                      : 'bg-brand text-brand-foreground hover:bg-brand-hover disabled:opacity-50',
                  )}
                >
                  {pendingPlan === p && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent
                    ? 'Current Plan'
                    : p === 'free'
                      ? 'Free forever'
                      : isCustomPriced
                        ? 'Contact sales'
                        : pendingPlan === p
                          ? 'Opening checkout…'
                          : 'Upgrade'}
                </button>
              </div>
            )
          })}
        </div>
        {checkoutError && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
          >
            {checkoutError}
          </p>
        )}
      </div>

      {/* Payment & invoices — handled by Gumroad, not stored locally. */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Payment Method &amp; Invoices</h2>
        <p className="mt-1 text-sm text-slate-400">
          Payments and invoices are managed by Gumroad. Open the Gumroad customer portal to update your card, download invoices, or cancel.
        </p>
        <Link
          href="https://lazynext.gumroad.com/library"
          target="_blank"
          rel="noopener"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          <FileText className="h-4 w-4" /> Open Gumroad portal
        </Link>
      </div>

      {/* Usage — real counts */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Usage</h2>
        <p className="mt-1 text-xs text-slate-500">Live counts from your workspace database.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usageRows.map((u) => {
            const percentage = pct(u.value, u.limit)
            return (
              <div key={u.label} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{u.label}</span>
                  <span className="text-xs text-slate-400">
                    {u.value} / {formatLimit(u.limit)}
                  </span>
                </div>
                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700"
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={u.label}
                >
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', u.color)}
                    style={{ width: `${u.limit < 0 ? 6 : percentage}%` }}
                  />
                </div>
                {u.limit < 0 && <p className="mt-1 text-2xs text-slate-600">No limit on your plan</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
