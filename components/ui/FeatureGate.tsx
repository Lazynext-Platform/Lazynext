'use client'

import { ReactNode, useEffect } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { hasFeature } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import type { PLAN_LIMITS } from '@/lib/utils/constants'

type Plan = keyof typeof PLAN_LIMITS

type UpgradeVariant =
  | 'node-limit'
  | 'ai-limit'
  | 'member-limit'
  | 'health-gate'
  | 'automation-gate'
  | 'sso-gate'
  | 'full-upgrade'

interface FeatureGateProps {
  /** Feature slug from lib/utils/plan-gates.ts featureMap. */
  feature: string
  /** Upgrade modal variant to open when the CTA is clicked. */
  variant: UpgradeVariant
  /** Displayed as the headline in the locked state. */
  title: string
  /** Short explainer shown under the headline. */
  description: string
  /** Display name of the tier that unlocks this feature (e.g. "Business"). */
  requiredTier: string
  children: ReactNode
}

/**
 * Wraps a page or section. If the workspace's plan doesn't unlock the
 * given feature, renders a paywall card instead of the children.
 *
 * Usage:
 *   <FeatureGate
 *     feature="automation"
 *     variant="automation-gate"
 *     title="Automation Rules"
 *     description="Trigger tasks and digests when decisions log or outcomes land."
 *     requiredTier="Business"
 *   >
 *     <AutomationsPage />
 *   </FeatureGate>
 */
export function FeatureGate({
  feature,
  variant,
  title,
  description,
  requiredTier,
  children,
}: FeatureGateProps) {
  const plan = (useWorkspaceStore((s) => s.workspace?.plan) || 'free') as Plan
  const unlocked = hasFeature(plan, feature)

  // Log a paywall impression exactly once per mount when the gate blocks.
  useEffect(() => {
    if (!unlocked) {
      trackBillingEvent('paywall.gate.shown', { feature, variant, plan, requiredTier })
    }
  }, [unlocked, feature, variant, plan, requiredTier])

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <Lock className="h-6 w-6 text-brand" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-50">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-semibold text-brand">
          <Sparkles className="h-3 w-3" />
          Included in {requiredTier}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => useUpgradeModal.getState().show(variant)}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-hover"
          >
            Upgrade to {requiredTier}
          </button>
          <p className="text-2xs text-slate-500">
            30-day Business trial on every paid plan — no credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}
