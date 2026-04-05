'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import { NodeWrapper } from './NodeWrapper'

export const DocNode = memo(function DocNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>
  return (
    <NodeWrapper type="doc" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      {d.status && (
        <span className="mt-2 inline-block rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-700">
          {d.status}
        </span>
      )}
    </NodeWrapper>
  )
})
