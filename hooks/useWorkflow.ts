'use client'

import { useState, useCallback } from 'react'

interface WorkflowData {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
}

export function useWorkflow(workflowId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkflow = useCallback(async (): Promise<WorkflowData | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/workflows/${workflowId}`)
      if (!res.ok) throw new Error('Failed to fetch workflow')
      const { data } = await res.json()
      return data
    } catch (e) {
      setError((e as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  const saveNode = useCallback(
    async (nodeId: string, updates: Record<string, unknown>) => {
      const res = await fetch(`/api/v1/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      return res.ok
    },
    []
  )

  return { fetchWorkflow, saveNode, loading, error }
}
