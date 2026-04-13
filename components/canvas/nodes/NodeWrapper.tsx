'use client'

import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils/cn'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'

interface NodeWrapperProps {
  type: NodeType
  children: React.ReactNode
  selected?: boolean
}

export function NodeWrapper({ type, children, selected }: NodeWrapperProps) {
  const colors = NODE_COLORS[type]

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !border-slate-400 !w-2 !h-2" />
      <div
        className={cn(
          'min-w-[200px] max-w-[280px] rounded-xl border-2 p-4 shadow-lg transition-shadow',
          colors.bg,
          colors.border,
          selected && 'ring-2 ring-brand ring-offset-2 ring-offset-slate-950 shadow-xl'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('text-2xs font-bold uppercase tracking-wider', colors.text)}>
            {type}
          </span>
        </div>
        {children}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !border-slate-400 !w-2 !h-2" />
    </>
  )
}
