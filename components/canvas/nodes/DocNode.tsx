'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeWrapper } from './NodeWrapper'

export const DocNode = memo(function DocNode({ data, selected }: NodeProps) {
  const d = data as Record<string, string>
  return (
    <NodeWrapper type="doc" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{d.title}</p>
      <div className="mt-2 flex items-center gap-2">
        {d.status && (
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-700">
            {d.status}
          </span>
        )}
        {d.updatedAt && (
          <span className="text-[10px] text-slate-500">Updated {d.updatedAt}</span>
        )}
      </div>
      {d.wordCount && (
        <p className="mt-1 text-[10px] text-slate-500">{d.wordCount} words</p>
      )}
    </NodeWrapper>
  )
})
