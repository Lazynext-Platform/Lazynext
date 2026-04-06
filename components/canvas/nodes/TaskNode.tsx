'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { User } from 'lucide-react'
import { NodeWrapper } from './NodeWrapper'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-400',
}

const statusColors: Record<string, string> = {
  backlog: 'bg-slate-400',
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  in_review: 'bg-purple-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-red-500',
}

export const TaskNode = memo(function TaskNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>

  return (
    <NodeWrapper type="task" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      <div className="mt-2 flex items-center gap-2">
        {d.status && (
          <span className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            <span className={`h-1.5 w-1.5 rounded-full ${statusColors[d.status] || 'bg-slate-400'}`} />
            {d.status.replace('_', ' ')}
          </span>
        )}
        {d.priority && (
          <span className={`h-2 w-2 rounded-full ${priorityColors[d.priority] || 'bg-slate-400'}`} title={d.priority} />
        )}
        {d.assignee && (
          <span className="flex items-center gap-1 text-[10px] text-slate-600">
            <User className="h-3 w-3" />
            {d.assignee}
          </span>
        )}
        {d.dueDate && (
          <span className="text-[10px] text-slate-500">{d.dueDate}</span>
        )}
      </div>
    </NodeWrapper>
  )
})
