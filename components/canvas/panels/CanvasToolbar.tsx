'use client'

import { useState } from 'react'
import {
  Plus,
  CheckSquare,
  FileText,
  GitBranch,
  MessageCircle,
  Activity,
  Zap,
  Table,
  X,
} from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'

const nodeOptions: { type: NodeType; icon: typeof CheckSquare; label: string }[] = [
  { type: 'task', icon: CheckSquare, label: 'Task' },
  { type: 'doc', icon: FileText, label: 'Doc' },
  { type: 'decision', icon: GitBranch, label: 'Decision' },
  { type: 'thread', icon: MessageCircle, label: 'Thread' },
  { type: 'pulse', icon: Activity, label: 'Pulse' },
  { type: 'automation', icon: Zap, label: 'Automation' },
  { type: 'table', icon: Table, label: 'Table' },
]

export function CanvasToolbar() {
  const [isOpen, setIsOpen] = useState(false)
  const addNode = useCanvasStore((s) => s.addNode)
  const nodes = useCanvasStore((s) => s.nodes)

  const handleAddNode = (type: NodeType) => {
    const id = `node-${Date.now()}`
    const offset = nodes.length * 30
    addNode({
      id,
      type,
      position: { x: 300 + offset, y: 200 + offset },
      data: { title: `New ${type}`, status: type === 'task' ? 'todo' : undefined },
    })
    setIsOpen(false)
  }

  return (
    <div className="absolute bottom-6 right-6 z-10">
      {isOpen && (
        <div className="mb-3 w-52 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl animate-slide-in-up">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Add node
          </p>
          {nodeOptions.map((opt) => {
            const colors = NODE_COLORS[opt.type]
            return (
              <button
                key={opt.type}
                onClick={() => handleAddNode(opt.type)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', colors.dot)}>
                  <opt.icon className="h-3.5 w-3.5 text-white" />
                </span>
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all',
          isOpen
            ? 'bg-slate-700 text-slate-300 rotate-45'
            : 'bg-brand text-white hover:bg-brand-hover hover:shadow-xl'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  )
}
