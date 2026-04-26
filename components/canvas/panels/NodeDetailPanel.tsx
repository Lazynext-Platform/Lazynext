'use client'

import { X } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { TaskDetailPanel } from './TaskDetailPanel'
import { DocDetailPanel } from './DocDetailPanel'
import { DecisionDetailPanel } from './DecisionDetailPanel'
import { ThreadPanel } from './ThreadPanel'
import TablePanel from './TablePanel'

function FallbackPanel({ title, type, onClose }: { title: string; type: string; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{type}</span>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="Close panel">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mt-2 text-xs text-slate-500">
          A dedicated detail panel for this node type isn&apos;t built yet.
        </p>
      </div>
    </div>
  )
}

export function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectNode = useCanvasStore((s) => s.selectNode)
  const node = nodes.find((n) => n.id === nodeId)

  if (!node) return null

  const onClose = () => selectNode(null)
  const data = (node.data ?? {}) as Record<string, unknown>
  const title = typeof data.title === 'string' ? data.title : 'Untitled'

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
        return <FallbackPanel title={title} type={node.type ?? 'node'} onClose={onClose} />
    }
  })()

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl motion-safe:animate-slide-in-right">
      {panelContent}
    </div>
  )
}
