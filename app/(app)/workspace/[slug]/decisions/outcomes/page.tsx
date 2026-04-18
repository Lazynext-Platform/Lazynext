import { notFound } from 'next/navigation'
import OutcomesClient from './OutcomesClient'
import { getCurrentMemberWorkspace, getPendingOutcomes } from '@/lib/data/workspace'

export default async function OutcomesPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const decisions = await getPendingOutcomes(workspace.id)

  return <OutcomesClient workspaceSlug={params.slug} decisions={decisions} />
}
