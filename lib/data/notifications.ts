// ─── Notifications data helpers ─────────────────────────────────────
// Backs the bell dropdown in components/ui/NotificationCenter.tsx.
//
// Insertion is server-side only (RLS forbids client-side inserts —
// see migration 20260427000001_notifications.sql). The mutation routes
// (decisions, nodes, threads) call createNotification() with the
// service-role `db` client after they've finished their own write.
// ─────────────────────────────────────────────────────────────────────

import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'decision_logged'
  | 'decision_outcome_pending'
  | 'thread_mention'
  | 'thread_reply'
  | 'workspace_invite'

export interface NotificationRow {
  id: string
  workspace_id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  related_node_id: string | null
  related_decision_id: string | null
  related_thread_id: string | null
  read_at: string | null
  created_at: string
}

export interface CreateNotificationInput {
  workspaceId: string
  userId: string
  actorId?: string | null
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  relatedNodeId?: string | null
  relatedDecisionId?: string | null
  relatedThreadId?: string | null
}

/**
 * Insert a single notification. Never throws — notification failures
 * must not block the underlying mutation (e.g. logging a decision
 * succeeded; failing to insert the bell-row should not 500 the request).
 * Returns true on success, false on any failure.
 */
export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  // Don't notify yourself about your own action.
  if (input.actorId && input.actorId === input.userId) return false
  const { error } = await db.from('notifications').insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    related_node_id: input.relatedNodeId ?? null,
    related_decision_id: input.relatedDecisionId ?? null,
    related_thread_id: input.relatedThreadId ?? null,
  })
  return !error
}

/**
 * Fan a notification out to every workspace member except the actor.
 * Used for workspace-wide events like "<actor> logged a decision".
 */
export async function notifyWorkspaceMembers(input: Omit<CreateNotificationInput, 'userId'>): Promise<number> {
  if (!hasValidDatabaseUrl) return 0
  const { data: members } = await db
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', input.workspaceId)

  type Row = { user_id: string }
  const rows = (members as Row[] | null) ?? []
  const recipients = rows
    .map((r) => r.user_id)
    .filter((uid) => uid !== input.actorId)

  if (recipients.length === 0) return 0

  const payload = recipients.map((user_id) => ({
    workspace_id: input.workspaceId,
    user_id,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    related_node_id: input.relatedNodeId ?? null,
    related_decision_id: input.relatedDecisionId ?? null,
    related_thread_id: input.relatedThreadId ?? null,
  }))
  const { error } = await db.from('notifications').insert(payload)
  return error ? 0 : payload.length
}

export interface NotificationView extends NotificationRow {
  actor: {
    id: string | null
    name: string | null
    email: string | null
    avatarUrl: string | null
  } | null
}

/**
 * Fetch the recipient's notifications for a workspace, newest first.
 * Hydrates the actor from auth.users so the UI can render initials/name.
 */
export async function listNotifications(opts: {
  userId: string
  workspaceId: string
  limit?: number
}): Promise<NotificationView[]> {
  if (!hasValidDatabaseUrl) return []
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
  const { data: notifs } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', opts.userId)
    .eq('workspace_id', opts.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (notifs as NotificationRow[] | null) ?? []
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v)))
  const actorMap = new Map<string, NotificationView['actor']>()

  if (actorIds.length > 0) {
    // Pull users via the admin API — auth.users isn't exposed via the public schema.
    const { data: usersRes } = await db.auth.admin.listUsers({ perPage: 200 })
    const users = usersRes?.users ?? []
    for (const u of users) {
      if (!actorIds.includes(u.id)) continue
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>
      actorMap.set(u.id, {
        id: u.id,
        name: (meta.full_name as string) ?? (meta.name as string) ?? null,
        email: u.email ?? null,
        avatarUrl: (meta.avatar_url as string) ?? null,
      })
    }
  }

  return rows.map((r) => ({
    ...r,
    actor: r.actor_id ? actorMap.get(r.actor_id) ?? { id: r.actor_id, name: null, email: null, avatarUrl: null } : null,
  }))
}

export async function markNotificationRead(opts: { userId: string; id: string }): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const { error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', opts.id)
    .eq('user_id', opts.userId)
    .is('read_at', null)
  return !error
}

export async function markAllNotificationsRead(opts: { userId: string; workspaceId: string }): Promise<number> {
  if (!hasValidDatabaseUrl) return 0
  const { count, error } = await db
    .from('notifications')
    .update({ read_at: new Date().toISOString() }, { count: 'exact' })
    .eq('user_id', opts.userId)
    .eq('workspace_id', opts.workspaceId)
    .is('read_at', null)
  return error ? 0 : count ?? 0
}
