'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeWrapper } from './NodeWrapper'

export const AutomationNode = memo(function AutomationNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>
  return (
    <NodeWrapper type="automation" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      {d.trigger && (
        <span className="mt-2 inline-block rounded-full bg-white/60 px-2 py-0.5 text-2xs font-mono text-slate-600">
          {d.trigger}
        </span>
      )}
    </NodeWrapper>
  )
})
