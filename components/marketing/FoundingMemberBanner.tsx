'use client'

import { useEffect, useState } from 'react'

type FoundingMemberState = {
  cap: number
  claimed: number
  remaining: number
  open: boolean
}

/**
 * Live Founding Member banner. Fetches remaining-spots on mount. Hides
 * itself if the promotion is closed so we never show a dead banner.
 */
export function FoundingMemberBanner() {
  const [state, setState] = useState<FoundingMemberState | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/v1/billing/founding-member')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setState(data)
      })
      .catch(() => {
        /* non-fatal — banner just stays in fallback copy */
      })
    return () => {
      alive = false
    }
  }, [])

  // Hide entirely once closed.
  if (state && !state.open) return null

  const remaining = state?.remaining ?? null

  return (
    <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Founding Member pricing — 30% off for life.{' '}
      {remaining === null
        ? 'Limited to the first 100 teams.'
        : remaining === 100
          ? 'All 100 spots open.'
          : `${remaining} of 100 spots left.`}
    </div>
  )
}
