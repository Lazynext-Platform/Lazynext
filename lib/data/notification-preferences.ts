// ─── Notification preferences ───────────────────────────────────────
// Per-user, per-workspace, per-event toggles. Backs the Settings →
// Notifications tab. Default behavior when no row exists is enabled,
// matching the existing "on by default" copy in the UI.
//
// Insertion is server-side via the service role (RLS allows users to
// upsert their own rows; we use the service role for consistency).

import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import type { NotificationType } from './notifications'

export const NOTIFICATION_TYPES: NotificationType[] = [
  'task_assigned',
  'task_due_soon',
  'decision_logged',
  'decision_outcome_pending',
  'thread_mention',
  'thread_reply',
  'workspace_invite',
]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task assigned to you',
  task_due_soon: 'Task due in the next 24 hours',
  decision_logged: 'New decision logged in this workspace',
  decision_outcome_pending: 'Decision outcome needs tagging',
  thread_mention: 'You were @mentioned in a thread',
  thread_reply: 'New reply in a thread you started',
  workspace_invite: 'You were invited to a workspace',
}

export interface NotificationPreference {
  type: NotificationType
  in_app: boolean
  email: boolean
}

/**
 * Returns one row per notification type for the user. If a row exists
 * in the table, it wins. Otherwise the default (in_app=true, email=false)
 * is returned. This is what the Settings page renders against.
 */
export async function getPreferences(opts: {
  userId: string
  workspaceId: string
}): Promise<NotificationPreference[]> {
  const defaults = NOTIFICATION_TYPES.map<NotificationPreference>((type) => ({
    type,
    in_app: true,
    email: false,
  }))
  if (!hasValidDatabaseUrl) return defaults

  const { data } = await db
    .from('notification_preferences')
    .select('type, in_app, email')
    .eq('user_id', opts.userId)
    .eq('workspace_id', opts.workspaceId)

  type Row = { type: NotificationType; in_app: boolean; email: boolean }
  const stored = new Map<NotificationType, Row>()
  for (const row of (data as Row[] | null) ?? []) stored.set(row.type, row)
  return defaults.map((d) => stored.get(d.type) ?? d)
}

/**
 * Upsert a single (user, workspace, type) preference row.
 */
export async function upsertPreference(opts: {
  userId: string
  workspaceId: string
  type: NotificationType
  in_app?: boolean
  email?: boolean
}): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const payload = {
    user_id: opts.userId,
    workspace_id: opts.workspaceId,
    type: opts.type,
    in_app: opts.in_app ?? true,
    email: opts.email ?? false,
    updated_at: new Date().toISOString(),
  }
  const { error } = await db
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'workspace_id,user_id,type' })
  return !error
}
