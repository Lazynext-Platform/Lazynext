import { notFound } from 'next/navigation'
import {
  getCurrentMemberWorkspace,
  getWorkspaceActivity,
  getWorkspaceUsers,
} from '@/lib/data/workspace'
import { ActivityClient } from './ActivityClient'

export const dynamic = 'force-dynamic'

export default async function ActivityPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const [events, members] = await Promise.all([
    getWorkspaceActivity(workspace.id, 100),
    getWorkspaceUsers(workspace.id),
  ])

  return (
    <ActivityClient
      events={events}
      members={members}
      workspaceName={workspace.name}
    />
  )
}
