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

/**
 * Returns the default (first / oldest) workflow for a workspace, creating one
 * if the workspace has none yet. Tasks/docs/decisions need a parent
 * workflow_id to live under, so any page that lets a user create a node
 * without a chosen workflow uses this.
 */
export async function getOrCreateDefaultWorkflow(
  workspaceId: string,
  createdBy: string,
): Promise<{ id: string } | null> {
  if (!hasValidDatabaseUrl) return null
  const { data: existing } = await db
    .from('workflows')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing) return existing as { id: string }
  const { data: created } = await db
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: 'Main',
      description: null,
      created_by: createdBy,
    })
    .select('id')
    .single()
  return (created as { id: string } | null) ?? null
}

export interface MemberUser {
  userId: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  initials: string
  role: 'admin' | 'member' | 'guest'
  joinedAt: string
}

/**
 * Returns the workspace's members joined with their auth.users profile data
 * (email, full name, avatar). Used by Tasks (assignee chip), Members
 * (directory page), Activity (actor name), and Pulse (counts).
 *
 * Requires the service-role Supabase client (which `db` already is) so the
 * `auth.admin.listUsers` call succeeds. Returned avatar/name are best-effort:
 * fall back to email and initials when metadata is missing.
 */
export async function getWorkspaceUsers(workspaceId: string): Promise<MemberUser[]> {
  if (!hasValidDatabaseUrl) return []
  const { data: rows } = await db
    .from('workspace_members')
    .select('user_id, role, joined_at')
    .eq('workspace_id', workspaceId)
  if (!rows || rows.length === 0) return []
  const userIds = (rows as Array<{ user_id: string }>).map((r) => r.user_id)

  // auth.admin.listUsers can't filter by id list directly, but we only need
  // workspace members so we pull the page and filter. For workspaces beyond
  // ~1000 members we'd paginate; that's a tomorrow problem.
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 })
  const usersById = new Map<string, { email: string | null; name: string | null; avatarUrl: string | null }>()
  for (const u of list?.users ?? []) {
    if (!userIds.includes(u.id)) continue
    const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string }
    usersById.set(u.id, {
      email: u.email ?? null,
      name: meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.avatar_url ?? null,
    })
  }

  return (rows as Array<{ user_id: string; role: 'admin' | 'member' | 'guest'; joined_at: string }>).map((r): MemberUser => {
    const u = usersById.get(r.user_id) ?? { email: null, name: null, avatarUrl: null }
    const display = u.name || u.email || 'Member'
    const initials = display
      .split(/[\s.@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
    return {
      userId: r.user_id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      initials,
      role: r.role,
      joinedAt: r.joined_at,
    }
  })
}

/**
 * Per-member counts of open tasks (assigned_to) and decisions logged
 * (made_by) within a workspace. Used by the Members directory.
 */
export async function getMemberStats(workspaceId: string): Promise<Map<string, { tasks: number; decisions: number }>> {
  const map = new Map<string, { tasks: number; decisions: number }>()
  if (!hasValidDatabaseUrl) return map

  const [{ data: taskRows }, { data: decisionRows }] = await Promise.all([
    db
      .from('nodes')
      .select('assigned_to')
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .neq('status', 'done')
      .not('assigned_to', 'is', null),
    db.from('decisions').select('made_by').eq('workspace_id', workspaceId),
  ])

  for (const r of (taskRows as Array<{ assigned_to: string | null }>) ?? []) {
    if (!r.assigned_to) continue
    const cur = map.get(r.assigned_to) ?? { tasks: 0, decisions: 0 }
    cur.tasks += 1
    map.set(r.assigned_to, cur)
  }
  for (const r of (decisionRows as Array<{ made_by: string }>) ?? []) {
    const cur = map.get(r.made_by) ?? { tasks: 0, decisions: 0 }
    cur.decisions += 1
    map.set(r.made_by, cur)
  }
  return map
}

export interface ActivityEvent {
  id: string
  type: 'decision' | 'node_created' | 'message'
  actorId: string
  title: string
  detail: string | null
  resourceType: 'decision' | 'task' | 'doc' | 'thread' | 'pulse' | 'automation' | 'table' | 'message'
  createdAt: string
}

/**
 * Composes a workspace activity feed from real tables: decisions, nodes,
 * and thread messages. There is no dedicated activity_events table in the
 * current schema, so we union three feeds and sort by created_at — same
 * shape the UI expects, no fake data.
 */
export async function getWorkspaceActivity(workspaceId: string, limit = 50): Promise<ActivityEvent[]> {
  if (!hasValidDatabaseUrl) return []

  const [decRes, nodeRes, msgRes] = await Promise.all([
    db
      .from('decisions')
      .select('id, question, made_by, created_at, quality_score')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('nodes')
      .select('id, type, title, created_by, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db
      .from('messages')
      .select('id, content, created_by, created_at, threads!inner(workspace_id, title, node_id)')
      .eq('threads.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const events: ActivityEvent[] = []
  for (const d of (decRes.data as Array<{ id: string; question: string; made_by: string; created_at: string; quality_score: number | null }>) ?? []) {
    events.push({
      id: `dec:${d.id}`,
      type: 'decision',
      actorId: d.made_by,
      title: d.question,
      detail: typeof d.quality_score === 'number' ? `Quality score: ${d.quality_score}` : null,
      resourceType: 'decision',
      createdAt: d.created_at,
    })
  }
  for (const n of (nodeRes.data as Array<{ id: string; type: string; title: string; created_by: string; created_at: string }>) ?? []) {
    if (n.type === 'decision') continue // already covered by decisions feed
    events.push({
      id: `node:${n.id}`,
      type: 'node_created',
      actorId: n.created_by,
      title: n.title,
      detail: null,
      resourceType: n.type as ActivityEvent['resourceType'],
      createdAt: n.created_at,
    })
  }
  for (const m of (msgRes.data as Array<{ id: string; content: string; created_by: string; created_at: string; threads: { title: string | null } | { title: string | null }[] }>) ?? []) {
    const thread = Array.isArray(m.threads) ? m.threads[0] : m.threads
    events.push({
      id: `msg:${m.id}`,
      type: 'message',
      actorId: m.created_by,
      title: thread?.title || 'Thread reply',
      detail: m.content.length > 120 ? m.content.slice(0, 120) + '…' : m.content,
      resourceType: 'message',
      createdAt: m.created_at,
    })
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return events.slice(0, limit)
}

export interface PulseStats {
  tasksDoneThisWeek: number
  totalOpenTasks: number
  overdueTasks: number
  decisionsThisWeek: number
  decisionsLastWeek: number
  tasksDoneLastWeek: number
  avgQualityThisWeek: number | null
  avgQualityLastWeek: number | null
  threadsActiveThisWeek: number
  threadsActiveLastWeek: number
  /** Tasks completed per day, oldest -> newest, length 7. */
  burndownDaily: { day: string; date: string; completed: number }[]
  /** Open task count per member (member must be in workspace). */
  workload: { userId: string; openTasks: number }[]
}

export async function getPulseStats(workspaceId: string): Promise<PulseStats> {
  if (!hasValidDatabaseUrl) {
    return {
      tasksDoneThisWeek: 0,
      totalOpenTasks: 0,
      overdueTasks: 0,
      decisionsThisWeek: 0,
      decisionsLastWeek: 0,
      tasksDoneLastWeek: 0,
      avgQualityThisWeek: null,
      avgQualityLastWeek: null,
      threadsActiveThisWeek: 0,
      threadsActiveLastWeek: 0,
      burndownDaily: [],
      workload: [],
    }
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)
  const todayIso = now.toISOString()
  const weekAgoIso = weekAgo.toISOString()
  const twoWeeksAgoIso = twoWeeksAgo.toISOString()

  const [
    doneThisWeek,
    doneLastWeek,
    openTasks,
    overdue,
    decsThisWeek,
    decsLastWeek,
    qualityThisWeek,
    qualityLastWeek,
    threadsThisWeek,
    threadsLastWeek,
    completedRecent,
    workloadRows,
  ] = await Promise.all([
    db
      .from('nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .eq('status', 'done')
      .gte('updated_at', weekAgoIso),
    db
      .from('nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .eq('status', 'done')
      .gte('updated_at', twoWeeksAgoIso)
      .lt('updated_at', weekAgoIso),
    db
      .from('nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .neq('status', 'done')
      .neq('status', 'cancelled'),
    db
      .from('nodes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .lt('due_at', todayIso),
    db
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', weekAgoIso),
    db
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', twoWeeksAgoIso)
      .lt('created_at', weekAgoIso),
    db
      .from('decisions')
      .select('quality_score')
      .eq('workspace_id', workspaceId)
      .not('quality_score', 'is', null)
      .gte('created_at', weekAgoIso),
    db
      .from('decisions')
      .select('quality_score')
      .eq('workspace_id', workspaceId)
      .not('quality_score', 'is', null)
      .gte('created_at', twoWeeksAgoIso)
      .lt('created_at', weekAgoIso),
    db
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_resolved', false)
      .gte('created_at', weekAgoIso),
    db
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_resolved', false)
      .gte('created_at', twoWeeksAgoIso)
      .lt('created_at', weekAgoIso),
    db
      .from('nodes')
      .select('updated_at')
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .eq('status', 'done')
      .gte('updated_at', weekAgoIso),
    db
      .from('nodes')
      .select('assigned_to')
      .eq('workspace_id', workspaceId)
      .eq('type', 'task')
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .not('assigned_to', 'is', null),
  ])

  // Burndown — completions per day for last 7 days (oldest -> newest).
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const buckets: { day: string; date: string; completed: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    buckets.push({ day: dayLabels[d.getDay()], date: d.toISOString().slice(0, 10), completed: 0 })
  }
  for (const r of (completedRecent.data as Array<{ updated_at: string }>) ?? []) {
    const dateKey = r.updated_at.slice(0, 10)
    const b = buckets.find((x) => x.date === dateKey)
    if (b) b.completed += 1
  }

  // Workload — count open tasks grouped by assignee.
  const workloadMap = new Map<string, number>()
  for (const r of (workloadRows.data as Array<{ assigned_to: string | null }>) ?? []) {
    if (!r.assigned_to) continue
    workloadMap.set(r.assigned_to, (workloadMap.get(r.assigned_to) ?? 0) + 1)
  }

  function avg(rows: { quality_score: number | null }[] | null): number | null {
    if (!rows || rows.length === 0) return null
    const sum = rows.reduce((acc, r) => acc + (r.quality_score ?? 0), 0)
    return Math.round(sum / rows.length)
  }

  return {
    tasksDoneThisWeek: doneThisWeek.count ?? 0,
    tasksDoneLastWeek: doneLastWeek.count ?? 0,
    totalOpenTasks: openTasks.count ?? 0,
    overdueTasks: overdue.count ?? 0,
    decisionsThisWeek: decsThisWeek.count ?? 0,
    decisionsLastWeek: decsLastWeek.count ?? 0,
    avgQualityThisWeek: avg(qualityThisWeek.data as Array<{ quality_score: number | null }> | null),
    avgQualityLastWeek: avg(qualityLastWeek.data as Array<{ quality_score: number | null }> | null),
    threadsActiveThisWeek: threadsThisWeek.count ?? 0,
    threadsActiveLastWeek: threadsLastWeek.count ?? 0,
    burndownDaily: buckets,
    workload: Array.from(workloadMap, ([userId, openTasks]) => ({ userId, openTasks })),
  }
}
