'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

const WorkflowCanvas = dynamic(
  () => import('@/components/canvas/WorkflowCanvas').then((m) => m.WorkflowCanvas),
  { ssr: false }
)

export default function CanvasPage() {
  const params = useParams<{ id: string }>()
  return <WorkflowCanvas workflowIdFromUrl={params?.id ?? null} />
}
