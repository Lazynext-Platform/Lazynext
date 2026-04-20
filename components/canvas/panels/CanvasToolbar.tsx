'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Info,
} from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { canCreateNode } from '@/lib/utils/plan-gates'
import { NODE_COLORS, PLAN_LIMITS, type NodeType } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'

type Plan = keyof typeof PLAN_LIMITS

const nodeOptions: {
  type: NodeType
  icon: typeof CheckSquare
  label: string
  shortcut: string
  disabled?: boolean
  badge?: string
}[] = [
  { type: 'task', icon: CheckSquare, label: 'Task', shortcut: 'T' },
  { type: 'doc', icon: FileText, label: 'Doc', shortcut: 'D' },
  { type: 'decision', icon: GitBranch, label: 'Decision', shortcut: 'Q' },
  { type: 'thread', icon: MessageCircle, label: 'Thread', shortcut: 'H' },
  { type: 'pulse', icon: Activity, label: 'Pulse', shortcut: 'P' },
  { type: 'automation', icon: Zap, label: 'Automation', shortcut: 'A' },
]

export function CanvasToolbar() {
  const [isOpen, setIsOpen] = useState(false)
  const addNode = useCanvasStore((s) => s.addNode)
  const nodes = useCanvasStore((s) => s.nodes)
  const plan = (useWorkspaceStore((s) => s.workspace?.plan) || 'free') as Plan

  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (!canCreateNode(plan, nodes.length)) {
        useUpgradeModal.getState().show('node-limit')
        setIsOpen(false)
        return
      }
      const id = `node-${Date.now()}`
      const offset = nodes.length * 30
      addNode({
        id,
        type,
        position: { x: 300 + offset, y: 200 + offset },
        data: { title: `New ${type}`, status: type === 'task' ? 'todo' : undefined },
      })
      setIsOpen(false)
    },
    [addNode, nodes.length, plan]
  )

  // Keyboard shortcut: N to toggle menu
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault()
          setIsOpen((o) => !o)
        }
      }
      // Direct shortcuts when menu is open
      if (isOpen && !e.metaKey && !e.ctrlKey) {
        const map: Record<string, NodeType> = { t: 'task', d: 'doc', q: 'decision', h: 'thread', p: 'pulse', a: 'automation' }
        const type = map[e.key.toLowerCase()]
        if (type) {
          e.preventDefault()
          handleAddNode(type)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleAddNode])

  return (
    <div className="absolute bottom-6 right-6 z-10">
      {isOpen && (
        <div className="mb-3 w-72 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl motion-safe:animate-slide-in-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-200">Add Node</span>
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-2xs font-medium text-slate-400">
              N
            </kbd>
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {nodeOptions.map((opt) => {
              const colors = NODE_COLORS[opt.type]
              return (
                <button
                  key={opt.type}
                  onClick={() => handleAddNode(opt.type)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-transparent px-2 py-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:border-slate-700 transition-all"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors.dot)}>
                    <opt.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">{opt.label}</span>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-3xs text-slate-500">
                    {opt.shortcut}
                  </kbd>
                </button>
              )
            })}
          </div>

          {/* Table (coming soon) */}
          <div className="mx-2 mb-2 flex items-center gap-3 rounded-lg bg-slate-800/30 px-3 py-2 opacity-50">
            <Table className="h-4 w-4 text-teal-400" />
            <span className="flex-1 text-xs text-slate-500">Table</span>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-3xs font-medium text-slate-400">
              Soon
            </span>
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-1.5 border-t border-slate-800 px-3 py-2">
            <Info className="h-3 w-3 text-slate-500" />
            <span className="text-2xs text-slate-500">Drag from a node handle to create an edge</span>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close node picker' : 'Add node'}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all',
          isOpen
            ? 'bg-slate-700 text-slate-300 rotate-45'
            : 'bg-brand text-white hover:bg-brand-hover hover:shadow-xl shadow-brand/20'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  )
}
