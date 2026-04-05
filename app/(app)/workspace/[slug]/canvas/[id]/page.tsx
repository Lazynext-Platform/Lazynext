'use client'

import dynamic from 'next/dynamic'

const WorkflowCanvas = dynamic(
  () => import('@/components/canvas/WorkflowCanvas').then((m) => m.WorkflowCanvas),
  { ssr: false }
)

export default function CanvasPage() {
  return <WorkflowCanvas />
}
