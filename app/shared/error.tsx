'use client'

import { useEffect } from 'react'
import { GeneralError } from '@/components/ui/EmptyStates'

export default function SharedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Shared error:', error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <GeneralError
        error={error.message}
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  )
}
