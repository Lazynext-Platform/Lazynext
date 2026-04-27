import { notFound } from 'next/navigation'
import { getCurrentMemberWorkspace, getBillingUsage } from '@/lib/data/workspace'
import type { PLAN_LIMITS } from '@/lib/utils/constants'
import { BillingClient } from './BillingClient'

type Plan = keyof typeof PLAN_LIMITS

export const dynamic = 'force-dynamic'

export default async function BillingPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const usage = await getBillingUsage(workspace.id)
  const plan = (workspace.plan ?? 'free') as Plan

  return <BillingClient slug={params.slug} workspaceId={workspace.id} workspacePlan={plan} usage={usage} />
}
