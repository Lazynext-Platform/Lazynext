'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard,
  Check,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import {
  PLAN_PRICING_USD,
  PLAN_PRICING_USD_ANNUAL,
  PLAN_LIMITS,
  TRIAL_DAYS,
} from '@/lib/utils/constants'

type PlanSlug = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

type BillingState = {
  plan: PlanSlug
  trial_ends_at: string | null
  gr_subscription_id: string | null
  gr_subscription_manage_url: string | null
  gr_customer_email: string | null
  daysUntilTrialEnd: number | null
  usage: {
    members: { count: number; limit: number }
    nodes: { count: number; limit: number }
    workflows: { count: number; limit: number }
  }
}

// Display mapping — DB plan slug → shown name. Keep in sync with UpgradeModal.
const PLAN_DISPLAY: Record<PlanSlug, string> = {
  free: 'Free',
  starter: 'Team',
  pro: 'Business',
  business: 'Enterprise',
  enterprise: 'Enterprise',
}

type PlanCard = {
  slug: Exclude<PlanSlug, 'enterprise'>
  name: string
  priceMonthly: number | null
  priceAnnual: number | null
  features: string[]
}

const planCards: PlanCard[] = [
  {
    slug: 'free',
    name: 'Free',
    priceMonthly: PLAN_PRICING_USD.free,
    priceAnnual: PLAN_PRICING_USD.free,
    features: [
      `${PLAN_LIMITS.free.members} members`,
      `${PLAN_LIMITS.free.workflows} workflows`,
      `${PLAN_LIMITS.free.nodes} nodes`,
      `${PLAN_LIMITS.free.aiQueries} AI queries/day`,
    ],
  },
  {
    slug: 'starter',
    name: PLAN_DISPLAY.starter,
    priceMonthly: PLAN_PRICING_USD.starter,
    priceAnnual: PLAN_PRICING_USD_ANNUAL.starter,
    features: [
      'Unlimited members',
      'Unlimited nodes',
      `${PLAN_LIMITS.starter.aiQueries} AI queries/seat/day`,
      'Core Decision DNA',
      'Decision Health Dashboard',
    ],
  },
  {
    slug: 'pro',
    name: PLAN_DISPLAY.pro,
    priceMonthly: PLAN_PRICING_USD.pro,
    priceAnnual: PLAN_PRICING_USD_ANNUAL.pro,
    features: [
      'Everything in Team',
      `${PLAN_LIMITS.pro.aiQueries} AI queries/seat/day`,
      'PULSE + Automation',
      'Outcome Tracking',
      'Priority support',
    ],
  },
  {
    slug: 'business',
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    features: ['Everything in Business', 'SSO / SAML', 'Audit log', 'SLA + dedicated support'],
  },
]

function formatTrialEndDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BillingPage() {
  const params = useParams()
  const slug = params.slug as string
  const currency = useUIStore((s) => s.currency)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [state, setState] = useState<BillingState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/v1/workspace/${slug}/billing`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body?.data) {
          if (!cancelled) {
            setLoadError(body?.error || `Failed to load billing (HTTP ${res.status})`)
          }
          return
        }
        if (!cancelled) setState(body.data as BillingState)
      } catch {
        if (!cancelled) setLoadError('Network error. Could not reach the billing service.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  function handleManageSubscription() {
    if (!state?.gr_subscription_id) return
    // Prefer the stamped URL. Fallback derives it from the subscription id
    // exactly the way our server-side portal route does.
    const url =
      state.gr_subscription_manage_url ||
      `https://app.gumroad.com/subscriptions/${encodeURIComponent(state.gr_subscription_id)}/manage`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-300">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing…
        </div>
      </div>
    )
  }

  const currentPlanName = PLAN_DISPLAY[state.plan]
  const currentPrice = PLAN_PRICING_USD[state.plan as keyof typeof PLAN_PRICING_USD] ?? null
  const isPaid = state.plan !== 'free' && state.plan !== 'enterprise'
  const hasSubscription = !!state.gr_subscription_id
  const inTrial = (state.daysUntilTrialEnd ?? 0) > 0 && isPaid

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Link
          href={`/workspace/${slug}/settings`}
          className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-3 w-3" /> Back to settings
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
          <CreditCard className="h-6 w-6 text-brand" />
          Billing & Subscription
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your subscription, payment methods, and usage.
        </p>

        {/* Current Plan */}
        <div
          className={cn(
            'mt-6 rounded-xl border-2 bg-slate-900 p-6',
            isPaid ? 'border-brand' : 'border-slate-700'
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-100">{currentPlanName} Plan</h2>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isPaid ? 'bg-brand/10 text-brand' : 'bg-slate-700 text-slate-300'
                  )}
                >
                  Current Plan
                </span>
                {inTrial && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    Trial · {state.daysUntilTrialEnd} {state.daysUntilTrialEnd === 1 ? 'day' : 'days'}{' '}
                    left
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {isPaid && currentPrice !== null
                  ? `${formatPrice(currentPrice, currency)}/seat/month`
                  : 'Free forever · no card required'}
                {inTrial && state.trial_ends_at && (
                  <> · First charge on {formatTrialEndDate(state.trial_ends_at)}</>
                )}
                {state.gr_customer_email && <> · {state.gr_customer_email}</>}
              </p>
            </div>
            <div className="flex gap-2">
              {hasSubscription ? (
                <button
                  onClick={handleManageSubscription}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage on Gumroad
                </button>
              ) : null}
              <button
                onClick={() => setShowUpgrade(true)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                {isPaid ? 'Change Plan' : 'Upgrade'}
              </button>
            </div>
          </div>
        </div>

        {/* Compare Plans */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Compare Plans</h2>
            <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  billingCycle === 'monthly' ? 'bg-brand text-white' : 'text-slate-400'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  billingCycle === 'yearly' ? 'bg-brand text-white' : 'text-slate-400'
                )}
              >
                Annual <span className="text-emerald-400">-20%</span>
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {planCards.map((plan) => {
              const isCurrent = state.plan === plan.slug
              const displayPrice =
                billingCycle === 'yearly' ? plan.priceAnnual : plan.priceMonthly
              const isEnterprise = plan.priceMonthly === null
              return (
                <div
                  key={plan.slug}
                  className={cn(
                    'relative rounded-xl border-2 bg-slate-900 p-5 transition-all',
                    isCurrent
                      ? 'border-brand'
                      : 'border-slate-800 hover:border-slate-600'
                  )}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-4 rounded-full bg-brand px-3 py-0.5 text-2xs font-bold text-white">
                      Current Plan
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                  <div className="mt-2 min-h-[40px]">
                    {isEnterprise ? (
                      <span className="text-2xl font-bold text-slate-50">Custom</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-slate-50">
                          {formatPrice(displayPrice ?? 0, currency)}
                        </span>
                        <span className="text-sm text-slate-500">
                          {plan.slug === 'free' ? '/forever' : '/seat/month'}
                        </span>
                      </>
                    )}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                        <Check className="h-3 w-3 text-emerald-400" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (isCurrent) return
                      if (isEnterprise) {
                        window.location.href = '/contact?topic=enterprise'
                        return
                      }
                      setShowUpgrade(true)
                    }}
                    disabled={isCurrent}
                    className={cn(
                      'mt-5 w-full rounded-lg py-2 text-sm font-semibold transition-colors',
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : 'bg-brand text-white hover:bg-brand-hover'
                    )}
                  >
                    {isCurrent ? 'Current Plan' : isEnterprise ? 'Contact Sales' : 'Upgrade'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Payment Method</h2>
          {hasSubscription ? (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-200">
                  {state.gr_customer_email || 'Active subscription'}
                </p>
                <p className="text-xs text-slate-500">
                  Card, billing, and receipts are managed on Gumroad.
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
              >
                <ExternalLink className="h-3 w-3" />
                Update on Gumroad
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No payment method on file. Upgrade to a paid plan to add one.
            </p>
          )}
        </div>

        {/* Billing History */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Billing History</h2>
          {hasSubscription ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-300">
                Receipts and invoices are hosted on Gumroad.
              </p>
              <button
                onClick={handleManageSubscription}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
              >
                <ExternalLink className="h-3 w-3" />
                View on Gumroad
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              No billing history yet. Receipts will appear here once you upgrade.
            </p>
          )}
        </div>

        {/* Usage */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Usage</h2>
          <p className="mt-1 text-xs text-slate-500">
            Live counts for this workspace. Paid plans remove most limits.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UsageMeter
              label="Members"
              value={state.usage.members.count}
              limit={state.usage.members.limit}
              color="bg-brand"
            />
            <UsageMeter
              label="Workflows"
              value={state.usage.workflows.count}
              limit={state.usage.workflows.limit}
              color="bg-emerald-500"
            />
            <UsageMeter
              label="Nodes"
              value={state.usage.nodes.count}
              limit={state.usage.nodes.limit}
              color="bg-amber-500"
            />
          </div>
        </div>

        <p className="mt-6 text-center text-2xs text-slate-600">
          {TRIAL_DAYS}-day free trial on every paid plan. Cancel anytime from Gumroad.
        </p>
      </div>

      {showUpgrade && (
        <UpgradeModal variant="full-upgrade" onClose={() => setShowUpgrade(false)} />
      )}
    </>
  )
}

function UsageMeter({
  label,
  value,
  limit,
  color,
}: {
  label: string
  value: number
  limit: number
  color: string
}) {
  const unlimited = limit < 0
  const pct = unlimited ? 0 : Math.min(100, Math.round((value / Math.max(limit, 1)) * 100))
  const near = !unlimited && pct >= 80

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={cn('text-xs', near ? 'text-amber-400' : 'text-slate-400')}>
          {unlimited ? `${value} · Unlimited` : `${value} / ${limit}`}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-valuenow={unlimited ? 0 : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {unlimited ? (
          <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-500/20" />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-700', color)}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}
