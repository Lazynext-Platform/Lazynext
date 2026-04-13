'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeWrapper } from './NodeWrapper'

export const ThreadNode = memo(function ThreadNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>
  return (
    <NodeWrapper type="thread" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      {d.messageCount && (
        <span className="mt-2 inline-block text-2xs text-slate-600">{d.messageCount} messages</span>
      )}
    </NodeWrapper>
  )
})
