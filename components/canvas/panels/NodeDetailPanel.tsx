'use client'

import { useCanvasStore } from '@/stores/canvas.store'
import { TaskDetailPanel } from './TaskDetailPanel'
import { DocDetailPanel } from './DocDetailPanel'
import { DecisionDetailPanel } from './DecisionDetailPanel'
import { ThreadPanel } from './ThreadPanel'
import TablePanel from './TablePanel'
import { NodeDetailPanelLegacy } from './NodeDetailPanelLegacy'

export function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const { nodes, selectNode } = useCanvasStore()
  const node = nodes.find((n) => n.id === nodeId)

  if (!node) return null

  const onClose = () => selectNode(null)

  const panelContent = (() => {
    switch (node.type) {
      case 'task':
        return <TaskDetailPanel nodeId={nodeId} onClose={onClose} />
      case 'doc':
        return <DocDetailPanel nodeId={nodeId} onClose={onClose} />
      case 'decision':
        return <DecisionDetailPanel nodeId={nodeId} onClose={onClose} />
      case 'thread':
        return <ThreadPanel nodeId={nodeId} onClose={onClose} />
      case 'table':
        return <TablePanel onClose={onClose} />
      default:
        return <NodeDetailPanelLegacy nodeId={nodeId} />
    }
  })()

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl animate-slide-in-right">
      {panelContent}
    </div>
  )
}
