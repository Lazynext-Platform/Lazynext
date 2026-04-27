'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEBOUNCE_MS = 600

interface PendingPosition {
  x: number
  y: number
}

/**
 * Watches the canvas store's `nodes` array and persists position changes
 * via the batch endpoint `POST /api/v1/nodes/positions`. Only persists
 * UUID-shaped (server-issued) ids — client-fabricated `node-1234567890`
 * scratchpad ids are skipped.
 *
 * One trailing-debounce timer (600ms) is shared across all in-flight
 * drags, so 50 rapid moves coalesce into a single round-trip with every
 * dirty position.
 *
 * On `pagehide` / `beforeunload`, anything still pending is flushed via
 * `navigator.sendBeacon`. Beacons survive page teardown where regular
 * fetch promises get cancelled, so the last drag of the session is
 * preserved instead of being lost on close.
 */
export function useCanvasPositionPersist() {
  const nodes = useCanvasStore((s) => s.nodes)
  const isHydrated = useCanvasStore((s) => s.isHydrated)
  const workflowId = useCanvasStore((s) => s.currentWorkflowId)
  const lastPositions = useRef(new Map<string, PendingPosition>())
  const pending = useRef(new Map<string, PendingPosition>())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isHydrated || !workflowId) return
    let dirty = false
    for (const node of nodes) {
      if (!UUID_RE.test(node.id)) continue
      const prev = lastPositions.current.get(node.id)
      const next: PendingPosition = {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      }
      if (prev && prev.x === next.x && prev.y === next.y) continue
      lastPositions.current.set(node.id, next)
      // First population during hydration shouldn't trigger a write.
      if (!prev) continue
      pending.current.set(node.id, next)
      dirty = true
    }
    if (!dirty) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const updates = Array.from(pending.current, ([id, p]) => ({
        id,
        positionX: p.x,
        positionY: p.y,
      }))
      pending.current.clear()
      if (updates.length === 0) return
      void fetch('/api/v1/nodes/positions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updates }),
      }).catch(() => undefined)
    }, DEBOUNCE_MS)
  }, [nodes, isHydrated, workflowId])

  // Beacon flush on page teardown. `pagehide` is more reliable than
  // `beforeunload` on iOS Safari and bfcache restores; we listen to
  // both. Beacons can only POST, which is exactly what the batch
  // endpoint accepts.
  useEffect(() => {
    function flush() {
      if (typeof navigator === 'undefined' || !navigator.sendBeacon) return
      if (pending.current.size === 0) return
      const updates = Array.from(pending.current, ([id, p]) => ({
        id,
        positionX: p.x,
        positionY: p.y,
      }))
      pending.current.clear()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const blob = new Blob([JSON.stringify({ updates })], {
        type: 'application/json',
      })
      navigator.sendBeacon('/api/v1/nodes/positions', blob)
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  // Cleanup on unmount: clear the timer (does not flush — server's last
  // known state is still authoritative on the next mount).
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])
}
