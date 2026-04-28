'use client'

import dynamic from 'next/dynamic'
import type { SharedCanvasNode, SharedCanvasEdge } from '@/lib/data/shared-canvas'

const SharedCanvasViewer = dynamic(
  () => import('./SharedCanvasViewer').then(m => m.SharedCanvasViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading canvas…</p>
      </div>
    ),
  },
)

export function SharedCanvasMount(props: { nodes: SharedCanvasNode[]; edges: SharedCanvasEdge[] }) {
  return <SharedCanvasViewer {...props} />
}
