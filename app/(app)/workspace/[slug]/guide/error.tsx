'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GuideError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error('Guide error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">Failed to load the platform guide. Please try again.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover">
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
        <Link href="." className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800">
          Go to Workspace
        </Link>
      </div>
    </div>
  )
}
