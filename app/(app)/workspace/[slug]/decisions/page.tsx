import { notFound } from 'next/navigation'
import DecisionsClient from './DecisionsClient'
import { getCurrentMemberWorkspace, getRecentDecisions } from '@/lib/data/workspace'

export default async function DecisionsPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const decisions = await getRecentDecisions(workspace.id, 200)

  return (
    <DecisionsClient
      workspaceId={workspace.id}
      workspaceSlug={params.slug}
      decisions={decisions}
    />
  )
}
