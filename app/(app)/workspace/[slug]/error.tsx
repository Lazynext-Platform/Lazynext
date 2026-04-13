'use client'

import { useEffect } from 'react'
import { GeneralError } from '@/components/ui/EmptyStates'

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Workspace error:', error)
    }
  }, [error])

  return (
    <GeneralError
      error={error.message}
      requestId={error.digest}
      onRetry={reset}
    />
  )
}
