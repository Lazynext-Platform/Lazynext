'use client'

import { useCallback } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import type { NodeType } from '@/lib/utils/constants'

export function useCanvas() {
  const { nodes, edges, addNode, removeNode, updateNodeData, selectNode, selectedNodeId } = useCanvasStore()

  const createNode = useCallback(
    (type: NodeType, title: string, position?: { x: number; y: number }) => {
      const id = `node-${Date.now()}`
      addNode({
        id,
        type,
        position: position || { x: Math.random() * 500 + 100, y: Math.random() * 400 + 100 },
        data: { title, status: type === 'task' ? 'todo' : undefined },
      })
      return id
    },
    [addNode]
  )

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    createNode,
    removeNode,
    updateNodeData,
    selectNode,
  }
}
