'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lock, Sparkles, Check, Crown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/i18n'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useToast } from '@/components/ui/ToastProvider'
import { useModalA11y } from '@/lib/utils/useModalA11y'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_PRICING_USD, PLAN_PRICING_USD_ANNUAL, TRIAL_DAYS } from '@/lib/utils/constants'

type ModalVariant = 'node-limit' | 'ai-limit' | 'member-limit' | 'health-gate' | 'automation-gate' | 'sso-gate' | 'full-upgrade'
type PlanSlug = 'starter' | 'pro' | 'business'

type PlanCard = {
  slug: PlanSlug
  name: string
  priceMonthly: number | null
  priceAnnual: number | null
  features: string[]
  accent: string
  popular: boolean
}

const planCards: PlanCard[] = [
  {
    slug: 'starter',
    name: 'Team',
    priceMonthly: PLAN_PRICING_USD.starter,
    priceAnnual: PLAN_PRICING_USD_ANNUAL.starter,
    features: ['Unlimited members', 'Unlimited nodes', '100 AI queries / seat / day', 'Core Decision DNA', 'Decision Health Dashboard'],
    accent: 'border-brand',
    popular: false,
  },
  {
    slug: 'pro',
    name: 'Business',
    priceMonthly: PLAN_PRICING_USD.pro,
    priceAnnual: PLAN_PRICING_USD_ANNUAL.pro,
    features: ['Everything in Team', '500 AI queries / seat / day', 'PULSE + Automation', 'Outcome Tracking', 'Priority support'],
    accent: 'border-emerald-500',
    popular: true,
  },
  {
    slug: 'business',
    name: 'Enterprise',
    priceMonthly: null,
    priceAnnual: null,
    features: ['Everything in Business', 'SSO / SAML', 'Audit log', 'SLA + dedicated support', 'Custom contracts'],
    accent: 'border-purple-500/40',
    popular: false,
  },
]

const VARIANT_COPY: Record<ModalVariant, { title: string; locked?: { feature: string; tier: string; desc: string } }> = {
  'node-limit': { title: 'Node limit reached' },
  'ai-limit': { title: 'AI query limit reached' },
  'member-limit': { title: 'Member limit reached' },
  'full-upgrade': { title: 'Upgrade your plan' },
  'health-gate': {
    title: 'Unlock Decision Health',
    locked: { feature: 'Decision Health Dashboard', tier: 'Team', desc: 'Deep analytics on your team’s decision quality.' },
  },
  'automation-gate': {
    title: 'Unlock Automation',
    locked: { feature: 'Automation workflows', tier: 'Business', desc: 'Trigger tasks, digests, and Slack pings when decisions log or outcomes land.' },
  },
  'sso-gate': {
    title: 'Unlock SSO',
    locked: { feature: 'Single Sign-On (SAML)', tier: 'Enterprise', desc: 'Map corporate identity — with audit log and custom contracts.' },
  },
}

export function UpgradeModal({ variant = 'full-upgrade', onClose }: { variant?: ModalVariant; onClose: () => void }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingSlug, setLoadingSlug] = useState<PlanSlug | null>(null)
  const currency = useUIStore((s) => s.currency)
  const workspace = useWorkspaceStore((s) => s.workspace)
  const router = useRouter()
  const { toast } = useToast()
  const modalRef = useModalA11y()

  const copy = VARIANT_COPY[variant]

  // Log one impression per mount.
  useEffect(() => {
    trackBillingEvent('paywall.modal.opened', {
      variant,
      workspaceId: workspace?.id ?? null,
      currentPlan: workspace?.plan ?? 'free',
    })
  }, [variant, workspace?.id, workspace?.plan])

  async function handleChoose(slug: PlanSlug) {
    trackBillingEvent('paywall.checkout.clicked', {
      variant,
      plan: slug,
      interval: billingCycle,
      workspaceId: workspace?.id ?? null,
    })

    // Enterprise → sales-led, no Gumroad product.
    if (slug === 'business') {
      trackBillingEvent('paywall.contact.clicked', { variant, workspaceId: workspace?.id ?? null })
      router.push('/contact?topic=enterprise')
      return
    }

    if (!workspace?.id) {
      toast({
        type: 'error',
        title: 'No workspace selected',
        description: 'Open a workspace before upgrading.',
      })
      return
    }

    setLoadingSlug(slug)
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan: slug,
          interval: billingCycle,
          workspaceId: workspace.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        trackBillingEvent('paywall.checkout.errored', {
          variant,
          plan: slug,
          interval: billingCycle,
          workspaceId: workspace.id,
          status: res.status,
          errorCode: data?.error ?? null,
        })
        toast({
          type: 'error',
          title: 'Checkout unavailable',
          description:
            data?.message || data?.error || 'Billing isn’t configured yet. Please try again shortly.',
        })
        setLoadingSlug(null)
        return
      }
      trackBillingEvent('paywall.checkout.succeeded', {
        variant,
        plan: slug,
        interval: billingCycle,
        workspaceId: workspace.id,
      })
      // Redirect to Gumroad — URL includes url_params so the ping can stamp
      // the right workspace on return.
      window.location.href = data.url
    } catch {
      trackBillingEvent('paywall.checkout.errored', {
        variant,
        plan: slug,
        interval: billingCycle,
        workspaceId: workspace.id,
        errorCode: 'network_error',
      })
      toast({
        type: 'error',
        title: 'Network error',
        description: 'Could not reach the billing service.',
      })
      setLoadingSlug(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl mx-3 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h2 id="upgrade-modal-title" className="text-lg font-semibold text-slate-100">
              {copy.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close upgrade dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Contextual reason the user landed here */}
          {variant !== 'full-upgrade' && (
            <div
              className={cn(
                'mb-5 rounded-lg border p-4',
                variant === 'ai-limit'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-brand/20 bg-brand/5'
              )}
            >
              {variant === 'node-limit' && (
                <div>
                  <p className="text-sm text-slate-200">
                    You’ve hit the <strong className="text-white">Free plan node cap</strong>.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Team and Business unlock unlimited nodes.</p>
                </div>
              )}
              {variant === 'ai-limit' && (
                <div>
                  <p className="text-sm text-slate-200">
                    You’ve used <strong className="text-amber-400">all of today’s</strong> LazyMind AI queries.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Resets tomorrow — or upgrade for 100+ queries/seat/day.
                  </p>
                </div>
              )}
              {variant === 'member-limit' && (
                <div>
                  <p className="text-sm text-slate-200">
                    Free workspaces are capped at <strong className="text-white">3 members</strong>.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Paid plans give you unlimited seats.</p>
                </div>
              )}
              {copy.locked && (
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-brand" />
                  <div>
                    <p className="text-sm text-slate-200">
                      {copy.locked.feature} is a{' '}
                      <strong className="text-brand">{copy.locked.tier}</strong> feature.
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{copy.locked.desc}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex justify-center mb-4">
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

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {planCards.map((plan) => {
              const displayPrice = billingCycle === 'yearly' ? plan.priceAnnual : plan.priceMonthly
              const isLoading = loadingSlug === plan.slug
              const isEnterprise = plan.priceMonthly === null
              return (
                <div
                  key={plan.slug}
                  className={cn(
                    'rounded-xl border-2 bg-slate-800 p-4 relative',
                    plan.popular ? plan.accent : 'border-slate-700 hover:border-slate-600'
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2.5 py-0.5 text-3xs font-bold text-white">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-slate-100">{plan.name}</h3>
                  <div className="mt-1 min-h-[32px]">
                    {isEnterprise || displayPrice === null ? (
                      <span className="text-2xl font-bold text-slate-50">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-slate-50">
                          {formatPrice(displayPrice, currency)}
                        </span>
                        <span className="text-xs text-slate-500">/seat/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isLoading || loadingSlug !== null}
                    onClick={() => handleChoose(plan.slug)}
                    className={cn(
                      'mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                      plan.popular
                        ? 'bg-brand text-white hover:bg-brand-hover'
                        : 'border border-slate-600 text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isEnterprise ? 'Contact Sales' : `Choose ${plan.name}`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-slate-800 px-6 py-3 flex justify-between items-center">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">
            Maybe later
          </button>
          <p className="text-2xs text-slate-600">
            {TRIAL_DAYS}-day Business trial on every paid plan — cancel anytime.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline in-app trial banner. Renders nothing when `daysLeft` is 0 or
 * negative — the caller decides when to show it based on `trial_ends_at`.
 */
export function TrialBanner({ daysLeft = 0, onUpgrade }: { daysLeft?: number; onUpgrade?: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || daysLeft <= 0) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-brand/20 bg-brand/5 px-4 py-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <span className="text-sm text-slate-200">
          Business trial — <strong className="text-brand">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUpgrade}
          className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-hover"
        >
          Upgrade now
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss upgrade banner"
          className="text-slate-500 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
