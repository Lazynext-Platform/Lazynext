'use client'

import { useEffect } from 'react'
import { GeneralError } from '@/components/ui/EmptyStates'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <GeneralError
      error={error.message}
      requestId={error.digest}
      onRetry={reset}
    />
  )
}
