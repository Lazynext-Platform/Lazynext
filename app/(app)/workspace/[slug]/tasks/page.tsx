import { notFound } from 'next/navigation'
import {
  getCurrentMemberWorkspace,
  getWorkspaceTasks,
  getWorkspaceUsers,
  getOrCreateDefaultWorkflow,
} from '@/lib/data/workspace'
import { TasksClient } from './TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage({ params }: { params: { slug: string } }) {
  const { workspace, isMember, userId } = await getCurrentMemberWorkspace(params.slug)
  if (!workspace || !isMember || !userId) notFound()

  const [tasks, members, workflow] = await Promise.all([
    getWorkspaceTasks(workspace.id),
    getWorkspaceUsers(workspace.id),
    getOrCreateDefaultWorkflow(workspace.id, userId),
  ])

  if (!workflow) notFound()

  return (
    <TasksClient
      workspaceId={workspace.id}
      workflowId={workflow.id}
      tasks={tasks}
      members={members}
    />
  )
}
