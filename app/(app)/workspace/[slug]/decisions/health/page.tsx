import { notFound } from 'next/navigation'
import { FeatureGate } from '@/components/ui/FeatureGate'
import {
  getCurrentMemberWorkspace,
  getDecisionHealthStats,
  getWorkspaceUsers,
  type DecisionHealthPeriod,
} from '@/lib/data/workspace'
import { DecisionHealthClient } from './DecisionHealthClient'

export const dynamic = 'force-dynamic'

const VALID_PERIODS: DecisionHealthPeriod[] = ['7d', '30d', '90d', 'all']

export default async function DecisionHealthPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { period?: string }
}) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const period: DecisionHealthPeriod = VALID_PERIODS.includes(searchParams?.period as DecisionHealthPeriod)
    ? (searchParams!.period as DecisionHealthPeriod)
    : '30d'

  const [stats, members] = await Promise.all([
    getDecisionHealthStats(workspace.id, period),
    getWorkspaceUsers(workspace.id),
  ])

  return (
    <FeatureGate
      feature="decision-health"
      variant="health-gate"
      title="Decision Health Dashboard"
      description="Track decision quality, outcomes, and velocity across your workspace. See which decisions led to wins — and which need rework."
      requiredTier="Team"
    >
      <DecisionHealthClient
        stats={stats}
        members={members}
        period={period}
        slug={params.slug}
        workspaceId={workspace.id}
        plan={workspace.plan as 'free' | 'starter' | 'pro' | 'business' | 'enterprise'}
      />
    </FeatureGate>
  )
}
