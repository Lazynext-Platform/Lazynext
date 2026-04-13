'use client'

import { useState } from 'react'
import { ChevronRight, ArrowUpDown } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'

const typeFilters: { label: string; value: string; colorClass: string }[] = [
  { label: 'All', value: 'all', colorClass: 'bg-slate-700 text-white' },
  { label: 'Tasks', value: 'task', colorClass: 'bg-blue-500/15 text-blue-400' },
  { label: 'Docs', value: 'doc', colorClass: 'bg-emerald-500/15 text-emerald-400' },
  { label: 'Decisions', value: 'decision', colorClass: 'bg-orange-500/15 text-orange-400' },
  { label: 'Threads', value: 'thread', colorClass: 'bg-purple-500/15 text-purple-400' },
]

const borderColors: Record<string, string> = {
  task: 'border-l-blue-500',
  doc: 'border-l-emerald-500',
  decision: 'border-l-orange-500',
  thread: 'border-l-purple-500',
  pulse: 'border-l-cyan-500',
  automation: 'border-l-amber-500',
  table: 'border-l-teal-500',
}

const statusBadge: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'In Progress', color: 'bg-blue-500/15 text-blue-400' },
  done: { label: 'Done', color: 'bg-emerald-500/15 text-emerald-400' },
  todo: { label: 'To Do', color: 'bg-slate-700 text-slate-300' },
  backlog: { label: 'Backlog', color: 'bg-slate-700 text-slate-400' },
  in_review: { label: 'In Review', color: 'bg-purple-500/15 text-purple-400' },
  draft: { label: 'Draft', color: 'bg-slate-700 text-slate-400' },
  open: { label: 'Open', color: 'bg-amber-500/15 text-amber-400' },
  decided: { label: 'Decided', color: 'bg-emerald-500/15 text-emerald-400' },
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-400',
}

export function NodeListView({ onNodeSelect }: { onNodeSelect?: (id: string) => void }) {
  const { nodes, selectNode } = useCanvasStore()
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = activeFilter === 'all' ? nodes : nodes.filter((n) => n.type === activeFilter)

  const handleNodeClick = (id: string) => {
    selectNode(id)
    onNodeSelect?.(id)
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Filter pills */}
      <div className="sticky top-12 z-10 flex items-center gap-2 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm px-4 py-2.5 overflow-x-auto no-scrollbar">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === f.value ? f.colorClass : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
            )}
          >
            {f.label}
          </button>
        ))}
        <button aria-label="Sort nodes" className="ml-auto shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </div>

      {/* Node cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No nodes match this filter</p>
          </div>
        ) : (
          filtered.map((node) => {
            const d = node.data as Record<string, string | number | undefined>
            const type = node.type as NodeType
            const status = statusBadge[String(d.status)] || null
            const priority = priorityDot[String(d.priority)] || null
            const isDecision = type === 'decision'
            const qualityScore = typeof d.qualityScore === 'number' ? d.qualityScore : undefined

            return (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className={cn(
                  'w-full rounded-xl border-l-4 bg-slate-800 p-3 text-left transition-colors hover:bg-slate-750',
                  borderColors[type] || 'border-l-slate-600'
                )}
              >
                {/* Type label */}
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', NODE_COLORS[type]?.dot || 'bg-slate-500')} />
                  <span className={cn('text-2xs font-semibold uppercase tracking-wider', `text-${type === 'task' ? 'blue' : type === 'doc' ? 'emerald' : type === 'decision' ? 'orange' : type === 'thread' ? 'purple' : type === 'pulse' ? 'cyan' : type === 'automation' ? 'amber' : 'teal'}-400`)}>
                    {type}
                  </span>
                </div>

                {/* Title */}
                <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                  {String(d.title || 'Untitled')}
                </p>

                {/* Metadata row */}
                <div className="mt-2 flex items-center gap-2">
                  {d.assignee && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-4xs font-bold text-white">
                      {String(d.assignee)}
                    </span>
                  )}
                  {d.dueDate && (
                    <span className="text-2xs text-slate-500">{String(d.dueDate)}</span>
                  )}
                  {priority && <span className={cn('h-1.5 w-1.5 rounded-full', priority)} />}
                  {status && (
                    <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', status.color)}>
                      {status.label}
                    </span>
                  )}
                  {isDecision && qualityScore !== undefined && (
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-2xs font-bold',
                      qualityScore >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    )}>
                      Q: {qualityScore}
                    </span>
                  )}
                  {d.wordCount && (
                    <span className="text-2xs text-slate-500">{String(d.wordCount)} words</span>
                  )}
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-600" />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
