'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') { console.error('Shared view error:', error) }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-200">Unable to load shared workflow</h2>
        <p className="mt-2 text-sm text-slate-500">This link may have expired or the workflow may no longer be shared.</p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
