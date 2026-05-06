'use client'

import { Printer } from 'lucide-react'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { hasFeature } from '@/lib/utils/plan-gates'

type Plan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

interface Props {
  workspaceId: string
  plan: Plan
  className?: string
}

/**
 * Decision DNA → PDF export button (#42).
 *
 * Free tier: clicking opens the upgrade modal with the `pdf-export-gate`
 * variant — never opens a tab they're going to bounce off of.
 * Paid tier: opens `/api/v1/decisions/report?workspaceId=…` in a new tab.
 * The HTML response auto-fires `window.print()` so the user lands directly
 * in the system print dialog and saves to PDF.
 */
export function ExportPdfButton({ workspaceId, plan, className }: Props) {
  const allowed = hasFeature(plan, 'pdf-export')

  function handleClick() {
    if (!allowed) {
      useUpgradeModal.getState().show('pdf-export-gate')
      return
    }
    const url = `/api/v1/decisions/report?workspaceId=${encodeURIComponent(workspaceId)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-slate-950'
      }
      title={
        allowed
          ? 'Open print-ready Decision DNA report'
          : 'PDF export is available on the Team plan'
      }
    >
      <Printer className="h-4 w-4" aria-hidden />
      Export PDF
    </button>
  )
}
