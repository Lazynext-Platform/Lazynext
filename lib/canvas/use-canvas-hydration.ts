'use client'

import { useEffect, useRef } from 'react'
import { type Node, type Edge } from '@xyflow/react'
import { useCanvasStore } from '@/stores/canvas.store'

interface ServerNode {
  id: string
  type: string
  title: string
  data: Record<string, unknown> | null
  position_x: number
  position_y: number
  status: string | null
}

interface ServerEdge {
  id: string
  source_id: string
  target_id: string
}

/**
 * Hydrates the canvas from the workspace's default workflow:
 *
 *   1. Resolves the workflow id via `/api/v1/workflows/default`.
 *   2. Loads its nodes + edges in parallel.
 *   3. Sets `currentWorkflowId` / `currentWorkspaceId` on the store so
 *      downstream code (share dialog, drag-persist) can light up.
 *
 * Failures are swallowed honestly \u2014 the canvas falls back to a
 * scratchpad mode (no persistence) instead of crashing the page.
 */
export function useCanvasHydration(workspaceId: string | null) {
  const hydrateCanvas = useCanvasStore((s) => s.hydrateCanvas)
  const setWorkflowContext = useCanvasStore((s) => s.setWorkflowContext)
  const setHydrated = useCanvasStore((s) => s.setHydrated)
  const isHydrated = useCanvasStore((s) => s.isHydrated)
  const lastWorkspaceId = useRef<string | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    if (lastWorkspaceId.current === workspaceId && isHydrated) return
    lastWorkspaceId.current = workspaceId

    let cancelled = false

    async function run() {
      try {
        const wfRes = await fetch(
          `/api/v1/workflows/default?workspaceId=${workspaceId}`,
          { cache: 'no-store' },
        )
        if (!wfRes.ok) {
          if (!cancelled) setHydrated(true)
          return
        }
        const wfJson = (await wfRes.json()) as {
          data: { id: string; name: string }
        }
        if (cancelled) return

        // Pull nodes + edges in parallel.
        const [nodesRes, edgesRes] = await Promise.all([
          fetch(`/api/v1/nodes?workflowId=${wfJson.data.id}`, { cache: 'no-store' }),
          fetch(`/api/v1/edges?workflowId=${wfJson.data.id}`, { cache: 'no-store' }),
        ])
        if (cancelled) return

        const nodesJson = nodesRes.ok
          ? ((await nodesRes.json()) as { data: ServerNode[] })
          : { data: [] }
        const edgesJson = edgesRes.ok
          ? ((await edgesRes.json()) as { data: ServerEdge[] })
          : { data: [] }
        if (cancelled) return

        const nodes: Node[] = (nodesJson.data ?? []).map((n) => ({
          id: n.id,
          type: n.type,
          position: { x: n.position_x, y: n.position_y },
          data: {
            ...(n.data ?? {}),
            title: n.title,
            status: n.status ?? undefined,
          },
        }))

        const edges: Edge[] = (edgesJson.data ?? []).map((e) => ({
          id: e.id,
          source: e.source_id,
          target: e.target_id,
          type: 'workflow',
        }))

        setWorkflowContext({
          workflowId: wfJson.data.id,
          workflowName: wfJson.data.name,
          workspaceId: workspaceId!,
        })
        hydrateCanvas(nodes, edges)
        setHydrated(true)
      } catch {
        if (!cancelled) setHydrated(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [workspaceId, hydrateCanvas, setWorkflowContext, setHydrated, isHydrated])
}
