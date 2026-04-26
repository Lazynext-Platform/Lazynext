import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import {
  getCurrentMemberWorkspace,
  getWorkspaceUsers,
  getMemberStats,
} from '@/lib/data/workspace'
import { MembersClient } from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function MembersPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember, userId } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember) notFound()

  const [members, stats] = await Promise.all([
    getWorkspaceUsers(workspace.id),
    getMemberStats(workspace.id),
  ])

  const merged = members.map((m) => ({
    ...m,
    tasks: stats.get(m.userId)?.tasks ?? 0,
    decisions: stats.get(m.userId)?.decisions ?? 0,
  }))

  // Sort: owner first, then admins, then members, then guests; then alpha by name.
  merged.sort((a, b) => {
    if (a.userId === workspace.created_by) return -1
    if (b.userId === workspace.created_by) return 1
    const order = { admin: 0, member: 1, guest: 2 } as const
    if (a.role !== b.role) return order[a.role] - order[b.role]
    return (a.name || a.email || '').localeCompare(b.name || b.email || '')
  })

  const h = headers()
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const host = h.get('host') ?? 'lazynext.com'
  const workspaceUrl = `${proto}://${host}/workspace/${params.slug}`

  return (
    <MembersClient
      members={merged}
      workspaceName={workspace.name}
      workspaceUrl={workspaceUrl}
      plan={workspace.plan}
      currentUserId={userId}
      ownerId={workspace.created_by}
    />
  )
}
