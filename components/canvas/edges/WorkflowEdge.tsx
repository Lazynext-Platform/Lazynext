'use client'

import { BaseEdge, getBezierPath, type EdgeProps, EdgeLabelRenderer } from '@xyflow/react'

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#4F6EF7' : '#334155',
          strokeWidth: selected ? 2 : 1.5,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          ...style,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
