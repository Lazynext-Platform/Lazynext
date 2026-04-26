import { notFound } from 'next/navigation'
import { FeatureGate } from '@/components/ui/FeatureGate'
import {
  getCurrentMemberWorkspace,
  getPulseStats,
  getWorkspaceUsers,
  getWorkspaceActivity,
} from '@/lib/data/workspace'
import { PulseClient } from './PulseClient'

export const dynamic = 'force-dynamic'

export default async function PulsePage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const [stats, members, recentEvents] = await Promise.all([
    getPulseStats(workspace.id),
    getWorkspaceUsers(workspace.id),
    getWorkspaceActivity(workspace.id, 10),
  ])

  return (
    <FeatureGate
      feature="pulse"
      variant="automation-gate"
      title="PULSE Dashboard"
      description="Live team health — workload, velocity, blockers, and burndown. Make standups redundant."
      requiredTier="Business"
    >
      <PulseClient
        stats={stats}
        members={members}
        recentEvents={recentEvents}
        workspaceName={workspace.name}
      />
    </FeatureGate>
  )
}
