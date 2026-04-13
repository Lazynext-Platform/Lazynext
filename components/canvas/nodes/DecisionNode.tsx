'use client'

import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { NodeWrapper } from './NodeWrapper'

export const DecisionNode = memo(function DecisionNode({ data, selected }: NodeProps) {
  const title = String(data.title || '')
  const status = data.status ? String(data.status) : null
  const score = typeof data.qualityScore === 'number' ? data.qualityScore : undefined
  const scoreColor = score !== undefined
    ? score >= 70 ? 'text-emerald-600 bg-emerald-100' : score >= 40 ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100'
    : ''

  return (
    <NodeWrapper type="decision" selected={selected}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        {status && (
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-2xs font-medium capitalize text-slate-700">
            {status}
          </span>
        )}
        {score !== undefined && (
          <span className={`rounded-full px-2 py-0.5 text-2xs font-bold ${scoreColor}`}>
            Q: {score}
          </span>
        )}
      </div>
    </NodeWrapper>
  )
})
