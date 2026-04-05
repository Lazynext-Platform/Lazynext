'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeWrapper } from './NodeWrapper'

export const PulseNode = memo(function PulseNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>
  return (
    <NodeWrapper type="pulse" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      {d.metric && (
        <span className="mt-2 inline-block text-[10px] text-slate-600">{d.metric}</span>
      )}
    </NodeWrapper>
  )
})
