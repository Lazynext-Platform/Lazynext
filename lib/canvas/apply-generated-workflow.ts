'use client'

import { useCanvasStore } from '@/stores/canvas.store'
import { createNodeOnServer, createEdgeOnServer } from './persist-helpers'
import { layoutTopDown } from './auto-layout'
import type { GeneratedWorkflow } from '@/lib/ai/workflow-generator'
import type { NodeType } from '@/lib/utils/constants'

export interface CommitResult {
  /** Number of nodes the server actually persisted. */
  nodesCreated: number
  /** Number of edges the server actually persisted. */
  edgesCreated: number
  /** True if some nodes failed (partial commit). */
  partial: boolean
}

/**
 * Commits an AI-generated workflow into the live canvas store + persists
 * each node + edge through the existing /api/v1/nodes and /api/v1/edges
 * endpoints. Idempotent per call: re-running the same graph creates a
 * SECOND copy — call sites must guard against re-submit.
 *
 * The server returns real UUIDs; we map tempIds → uuids in-flight so
 * edges can reference them. If a node create fails, all edges that
 * touch its tempId are skipped (the loop pushes the partial state
 * forward; honest > rolled-back).
 */
export async function commitGeneratedWorkflow(
  graph: GeneratedWorkflow,
  viewportCenter: { x: number; y: number },
): Promise<CommitResult> {
  const { positions } = layoutTopDown(
    graph.nodes.map((n) => ({ tempId: n.tempId })),
    graph.edges.map((e) => ({ source: e.source, target: e.target })),
    viewportCenter,
  )

  // Snapshot the canvas store BEFORE creating nodes so we can pluck
  // server-issued UUIDs back out by title (the create helper appends
  // each new node to `nodes` after the server round-trip).
  const tempToUuid = new Map<string, string>()
  let nodesCreated = 0
  let partial = false

  for (const n of graph.nodes) {
    const before = useCanvasStore.getState().nodes.length
    const pos = positions.get(n.tempId) ?? viewportCenter
    try {
      await createNodeOnServer({
        type: n.type as NodeType,
        title: n.title,
        position: pos,
        data: n.description ? { description: n.description } : {},
        status: n.type === 'task' ? n.status ?? 'todo' : undefined,
      })
      const after = useCanvasStore.getState().nodes
      if (after.length > before) {
        const created = after[after.length - 1]
        tempToUuid.set(n.tempId, created.id)
        nodesCreated++
      } else {
        partial = true
      }
    } catch {
      partial = true
    }
  }

  let edgesCreated = 0
  for (const e of graph.edges) {
    const src = tempToUuid.get(e.source)
    const tgt = tempToUuid.get(e.target)
    if (!src || !tgt) {
      // Edge references a node we couldn't create; skip rather than
      // synthesize a phantom edge.
      partial = true
      continue
    }
    try {
      const result = await createEdgeOnServer({ source: src, target: tgt })
      // result is null when scratchpad path is taken; that's still
      // "created" from the user's perspective (it's in the store).
      void result
      edgesCreated++
    } catch {
      partial = true
    }
  }

  return { nodesCreated, edgesCreated, partial }
}
