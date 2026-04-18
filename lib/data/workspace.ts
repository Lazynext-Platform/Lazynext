// ─── Server-side data helpers for the authenticated app ─────────────
// These are thin wrappers around Supabase that server components can
// await directly. Kept here (not in `lib/db/`) because they carry
// workspace-scoped business logic (auth checks, stats aggregation).
// ─────────────────────────────────────────────────────────────────────

import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { safeAuth } from '@/lib/utils/auth'
import type { Decision, Workspace, Node } from '@/lib/db/schema'

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  if (!hasValidDatabaseUrl) return null
  const { data } = await db.from('workspaces').select('*').eq('slug', slug).maybeSingle()
  return (data as Workspace) ?? null
}

export async function getCurrentMemberWorkspace(slug: string): Promise<{
  userId: string | null
  workspace: Workspace | null
  isMember: boolean
}> {
  const { userId } = await safeAuth()
  const workspace = await getWorkspaceBySlug(slug)
  if (!userId || !workspace) return { userId, workspace, isMember: false }

  const { data: membership } = await db
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  return { userId, workspace, isMember: !!membership }
}

export interface WorkspaceStats {
  openDecisions: number
  pendingOutcomes: number
  avgQualityScore: number | null
  decisionsThisWeek: number
  assignedToMe: number
  unreadThreads: number
}

export async function getWorkspaceStats(workspaceId: string, userId: string | null): Promise<WorkspaceStats> {
  if (!hasValidDatabaseUrl) {
    return { openDecisions: 0, pendingOutcomes: 0, avgQualityScore: null, decisionsThisWeek: 0, assignedToMe: 0, unreadThreads: 0 }
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [open, pending, scored, recent, mine, threads] = await Promise.all([
    db.from('decisions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'open'),
    db.from('decisions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('outcome', 'pending'),
    db.from('decisions').select('quality_score').eq('workspace_id', workspaceId).not('quality_score', 'is', null),
    db.from('decisions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', weekAgo),
    userId
      ? db.from('nodes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('assigned_to', userId).neq('status', 'done')
      : Promise.resolve({ count: 0 }),
    db.from('threads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('is_resolved', false),
  ])

  const scores = (scored.data as Array<{ quality_score: number | null }> | null)?.map((r) => r.quality_score ?? 0).filter((n) => n > 0) ?? []
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  return {
    openDecisions: open.count ?? 0,
    pendingOutcomes: pending.count ?? 0,
    avgQualityScore: avg,
    decisionsThisWeek: recent.count ?? 0,
    assignedToMe: 'count' in mine ? mine.count ?? 0 : 0,
    unreadThreads: threads.count ?? 0,
  }
}

export async function getRecentDecisions(workspaceId: string, limit = 20): Promise<Decision[]> {
  if (!hasValidDatabaseUrl) return []
  const { data } = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Decision[]) ?? []
}

export async function getPendingOutcomes(workspaceId: string): Promise<Decision[]> {
  if (!hasValidDatabaseUrl) return []
  const { data } = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('outcome', 'pending')
    .eq('status', 'decided')
    .order('expected_by', { ascending: true, nullsFirst: false })
  return (data as Decision[]) ?? []
}

export async function getWorkspaceTasks(workspaceId: string): Promise<Node[]> {
  if (!hasValidDatabaseUrl) return []
  const { data } = await db
    .from('nodes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('type', 'task')
    .order('updated_at', { ascending: false })
    .limit(200)
  return (data as Node[]) ?? []
}
