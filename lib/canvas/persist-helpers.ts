'use client'

import { useCanvasStore } from '@/stores/canvas.store'
import type { NodeType } from '@/lib/utils/constants'

interface CreateNodePayload {
  type: NodeType
  title: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
  status?: string
}

interface CreatedNode {
  id: string
  type: string
  title: string
  data: Record<string, unknown> | null
  position_x: number
  position_y: number
  status: string | null
}

/**
 * POSTs a new node to the server and adds it to the canvas store with
 * the server-issued UUID. Falls back to a client-fabricated id (legacy
 * scratchpad behavior) when no workflow context is available \u2014 the
 * canvas may simply not be hydrated yet, or the user is in dev mode
 * with no DB. Returns the node that was added (server or scratch).
 */
export async function createNodeOnServer(payload: CreateNodePayload): Promise<void> {
  const { currentWorkflowId, currentWorkspaceId, addNode } = useCanvasStore.getState()

  // Scratchpad fallback: no workflow context means no server round-trip.
  if (!currentWorkflowId || !currentWorkspaceId) {
    addNode({
      id: `node-${Date.now()}`,
      type: payload.type,
      position: payload.position,
      data: { title: payload.title, status: payload.status, ...(payload.data ?? {}) },
    })
    return
  }

  try {
    const res = await fetch('/api/v1/nodes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId: currentWorkflowId,
        workspaceId: currentWorkspaceId,
        type: payload.type,
        title: payload.title,
        data: payload.data ?? {},
        positionX: Math.round(payload.position.x),
        positionY: Math.round(payload.position.y),
        status: payload.status,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data: CreatedNode }
    const n = json.data
    addNode({
      id: n.id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: {
        ...(n.data ?? {}),
        title: n.title,
        status: n.status ?? undefined,
      },
    })
  } catch {
    // Server failed \u2014 keep the action visible by falling back to the
    // scratchpad path. The next refresh will reveal the discrepancy
    // honestly (the node won't be there).
    addNode({
      id: `node-${Date.now()}`,
      type: payload.type,
      position: payload.position,
      data: { title: payload.title, status: payload.status, ...(payload.data ?? {}) },
    })
  }
}

interface CreateEdgePayload {
  source: string
  target: string
}

interface CreatedEdge {
  id: string
  source_id: string
  target_id: string
}

/**
 * POSTs a new edge and pushes the server-issued row into the canvas
 * store. Returns null and does nothing when no workflow context exists
 * or either endpoint isn't a UUID (scratchpad node) \u2014 those edges
 * can't be persisted server-side.
 */
export async function createEdgeOnServer(
  payload: CreateEdgePayload,
): Promise<{ id: string } | null> {
  const { currentWorkflowId, edges, setEdges } = useCanvasStore.getState()
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!currentWorkflowId || !UUID_RE.test(payload.source) || !UUID_RE.test(payload.target)) {
    // Scratchpad fallback: synthesize a client edge id and push to store.
    const localId = `edge-${Date.now()}`
    setEdges([
      ...edges,
      { id: localId, source: payload.source, target: payload.target, type: 'workflow' },
    ])
    return null
  }

  try {
    const res = await fetch('/api/v1/edges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflowId: currentWorkflowId,
        sourceId: payload.source,
        targetId: payload.target,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data: CreatedEdge }
    const e = json.data
    setEdges([
      ...useCanvasStore.getState().edges,
      { id: e.id, source: e.source_id, target: e.target_id, type: 'workflow' },
    ])
    return { id: e.id }
  } catch {
    const localId = `edge-${Date.now()}`
    setEdges([
      ...useCanvasStore.getState().edges,
      { id: localId, source: payload.source, target: payload.target, type: 'workflow' },
    ])
    return null
  }
}
