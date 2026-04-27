'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Watches the canvas store's `nodes` and `edges` arrays for removals of
 * UUID-shaped (server-issued) ids and fires the corresponding DELETE
 * against the API. Skips client-fabricated ids so the scratchpad
 * fallback doesn't 404.
 */
export function useCanvasDeletePersist() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const isHydrated = useCanvasStore((s) => s.isHydrated)
  const workflowId = useCanvasStore((s) => s.currentWorkflowId)
  const lastNodeIds = useRef(new Set<string>())
  const lastEdgeIds = useRef(new Set<string>())

  useEffect(() => {
    if (!isHydrated || !workflowId) return
    const currentNodeIds = new Set(nodes.map((n) => n.id))
    const previousNodeIds = lastNodeIds.current
    if (previousNodeIds.size === 0 && currentNodeIds.size > 0) {
      // First population after hydration: prime the set without firing.
      lastNodeIds.current = currentNodeIds
    } else {
      for (const id of previousNodeIds) {
        if (currentNodeIds.has(id)) continue
        if (!UUID_RE.test(id)) continue
        void fetch(`/api/v1/nodes/${id}`, { method: 'DELETE' }).catch(() => undefined)
      }
      lastNodeIds.current = currentNodeIds
    }
  }, [nodes, isHydrated, workflowId])

  useEffect(() => {
    if (!isHydrated || !workflowId) return
    const currentEdgeIds = new Set(edges.map((e) => e.id))
    const previousEdgeIds = lastEdgeIds.current
    if (previousEdgeIds.size === 0 && currentEdgeIds.size > 0) {
      lastEdgeIds.current = currentEdgeIds
    } else {
      for (const id of previousEdgeIds) {
        if (currentEdgeIds.has(id)) continue
        if (!UUID_RE.test(id)) continue
        void fetch(`/api/v1/edges?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }).catch(() => undefined)
      }
      lastEdgeIds.current = currentEdgeIds
    }
  }, [edges, isHydrated, workflowId])
}
