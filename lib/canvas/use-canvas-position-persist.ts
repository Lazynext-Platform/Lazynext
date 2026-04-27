'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEBOUNCE_MS = 600

/**
 * Watches the canvas store's `nodes` array and persists position changes
 * to `/api/v1/nodes/[id]` via debounced PATCH. Only persists nodes whose
 * id is a real UUID (server-issued) \u2014 client-fabricated ids
 * (`node-1234567890`) are skipped, which keeps the per-session-scratchpad
 * fallback working without lying about persistence.
 */
export function useCanvasPositionPersist() {
  const nodes = useCanvasStore((s) => s.nodes)
  const isHydrated = useCanvasStore((s) => s.isHydrated)
  const workflowId = useCanvasStore((s) => s.currentWorkflowId)
  const lastPositions = useRef(new Map<string, { x: number; y: number }>())
  const pendingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (!isHydrated || !workflowId) return
    for (const node of nodes) {
      if (!UUID_RE.test(node.id)) continue
      const prev = lastPositions.current.get(node.id)
      const next = { x: Math.round(node.position.x), y: Math.round(node.position.y) }
      if (prev && prev.x === next.x && prev.y === next.y) continue
      lastPositions.current.set(node.id, next)
      // First population during hydration shouldn't trigger a write.
      if (!prev) continue

      const existing = pendingTimers.current.get(node.id)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        pendingTimers.current.delete(node.id)
        void fetch(`/api/v1/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ positionX: next.x, positionY: next.y }),
        }).catch(() => undefined)
      }, DEBOUNCE_MS)
      pendingTimers.current.set(node.id, timer)
    }
  }, [nodes, isHydrated, workflowId])

  // Cleanup on unmount: flush nothing \u2014 timers are cleared so any
  // position drift in the last 600 ms isn't persisted, but the next
  // mount will re-hydrate from the server's last known state. A flush
  // on `beforeunload` is a follow-up.
  useEffect(() => {
    const timers = pendingTimers.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])
}
