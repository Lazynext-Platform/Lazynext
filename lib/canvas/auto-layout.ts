/**
 * Top-down BFS layered layout for AI-generated workflows.
 *
 * Pure function — no DOM, no React, no canvas state. The result is a
 * `Map<tempId, {x, y}>` that the commit helper translates by the
 * current viewport center.
 *
 * Architecture: docs/features/41-ai-workflow-generation/architecture.md
 * → "Auto-Layout Algorithm". Hand-rolled (no dagre dep) because graphs
 * are capped at 12 nodes; that math is trivial.
 */

const COLUMN_WIDTH = 280
const ROW_HEIGHT = 140

export interface LayoutNodeRef {
  tempId: string
}

export interface LayoutEdgeRef {
  source: string
  target: string
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  layers: number
}

export function layoutTopDown(
  nodes: LayoutNodeRef[],
  edges: LayoutEdgeRef[],
  origin: { x: number; y: number } = { x: 0, y: 0 },
): LayoutResult {
  const positions = new Map<string, { x: number; y: number }>()
  if (nodes.length === 0) return { positions, layers: 0 }

  const ids = new Set(nodes.map((n) => n.tempId))
  // Build adjacency lists (only edges between known nodes).
  const childrenOf = new Map<string, string[]>()
  const parentsOf = new Map<string, string[]>()
  for (const n of nodes) {
    childrenOf.set(n.tempId, [])
    parentsOf.set(n.tempId, [])
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue
    childrenOf.get(e.source)!.push(e.target)
    parentsOf.get(e.target)!.push(e.source)
  }

  // Roots = nodes with no inbound edge. If the graph is a pure cycle,
  // pick the first declared node so we still produce SOMETHING.
  const roots = nodes.filter((n) => parentsOf.get(n.tempId)!.length === 0).map((n) => n.tempId)
  if (roots.length === 0) roots.push(nodes[0].tempId)

  const layer = new Map<string, number>()
  const queue: string[] = []
  for (const r of roots) {
    layer.set(r, 0)
    queue.push(r)
  }

  // Cap iterations at nodes.length × children-cap to defend against
  // adversarial cycles that slipped past the validator.
  const maxIters = nodes.length * 4
  let iters = 0
  while (queue.length > 0 && iters < maxIters) {
    iters++
    const id = queue.shift()!
    const myLayer = layer.get(id) ?? 0
    for (const child of childrenOf.get(id) ?? []) {
      const childLayer = (layer.get(child) ?? -1)
      const proposed = myLayer + 1
      if (proposed > childLayer) {
        layer.set(child, proposed)
        queue.push(child)
      }
    }
  }

  // Any nodes that BFS missed (isolated + non-root) get layer 0.
  for (const n of nodes) {
    if (!layer.has(n.tempId)) layer.set(n.tempId, 0)
  }

  // Group by layer and assign slot positions.
  const byLayer = new Map<number, string[]>()
  for (const n of nodes) {
    const l = layer.get(n.tempId)!
    if (!byLayer.has(l)) byLayer.set(l, [])
    byLayer.get(l)!.push(n.tempId)
  }

  const layerCount = Math.max(...Array.from(byLayer.keys())) + 1

  for (const [l, ids] of byLayer.entries()) {
    const totalWidth = (ids.length - 1) * COLUMN_WIDTH
    ids.forEach((id, i) => {
      positions.set(id, {
        x: origin.x + i * COLUMN_WIDTH - totalWidth / 2,
        y: origin.y + l * ROW_HEIGHT,
      })
    })
  }

  return { positions, layers: layerCount }
}
