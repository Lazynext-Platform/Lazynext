import { notFound } from 'next/navigation'
import { FeatureGate } from '@/components/ui/FeatureGate'
import { getCurrentMemberWorkspace } from '@/lib/data/workspace'
import { AutomationsClient } from './AutomationsClient'

export const dynamic = 'force-dynamic'

export default async function AutomationsPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  return (
    <FeatureGate
      feature="automations"
      variant="automation-gate"
      title="Automations"
      description="Trigger workflows on events, schedules, or quality thresholds."
      requiredTier="Pro"
    >
      <AutomationsClient workspaceId={workspace.id} />
    </FeatureGate>
  )
}
