// ─── Automations data layer + engine ────────────────────────────────
// Real WHEN/THEN engine. Two trigger types ship in v1:
//   - decision.logged     (POST /api/v1/decisions)
//   - task.created        (POST /api/v1/nodes with type=task)
// Two action types:
//   - notification.send   → notifyWorkspaceMembers
//   - webhook.post        → fetch POST with the event payload
//
// runAutomations() is invoked synchronously after the underlying
// mutation succeeds. Run rows are written to the existing
// `automation_runs` table (now keyed on automation_id; node_id is
// nullable). Failures never propagate — automations must not 500
// the user-facing write.

import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { notifyWorkspaceMembers } from '@/lib/data/notifications'

export const TRIGGER_TYPES = ['decision.logged', 'task.created'] as const
export type TriggerType = typeof TRIGGER_TYPES[number]

export const ACTION_TYPES = ['notification.send', 'webhook.post'] as const
export type ActionType = typeof ACTION_TYPES[number]

export interface AutomationRow {
  id: string
  workspace_id: string
  name: string
  description: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  action_type: ActionType
  action_config: Record<string, unknown>
  enabled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AutomationRunRow {
  id: string
  automation_id: string | null
  workspace_id: string
  status: string
  result: Record<string, unknown> | null
  error: string | null
  started_at: string
  completed_at: string | null
}

interface BaseEvent {
  workspaceId: string
  actorId: string | null
}

export interface DecisionLoggedEvent extends BaseEvent {
  type: 'decision.logged'
  decisionId: string
  question: string
  decisionType: string | null
  qualityScore: number
  workspaceSlug: string | null
}

export interface TaskCreatedEvent extends BaseEvent {
  type: 'task.created'
  nodeId: string
  title: string
  assignedTo: string | null
  workspaceSlug: string | null
}

export type AutomationEvent = DecisionLoggedEvent | TaskCreatedEvent

// ─── List + CRUD ───────────────────────────────────────────────────

export async function listAutomations(workspaceId: string): Promise<AutomationRow[]> {
  if (!hasValidDatabaseUrl) return []
  const { data, error } = await db
    .from('automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as AutomationRow[]
}

export async function createAutomation(args: {
  workspaceId: string
  createdBy: string
  name: string
  description?: string | null
  triggerType: TriggerType
  triggerConfig?: Record<string, unknown>
  actionType: ActionType
  actionConfig?: Record<string, unknown>
  enabled?: boolean
}): Promise<{ id: string } | null> {
  if (!hasValidDatabaseUrl) return null
  const { data, error } = await db
    .from('automations')
    .insert({
      workspace_id: args.workspaceId,
      created_by: args.createdBy,
      name: args.name,
      description: args.description ?? null,
      trigger_type: args.triggerType,
      trigger_config: args.triggerConfig ?? {},
      action_type: args.actionType,
      action_config: args.actionConfig ?? {},
      enabled: args.enabled ?? true,
    })
    .select('id')
    .single()
  if (error || !data) return null
  return { id: (data as { id: string }).id }
}

export async function updateAutomation(
  id: string,
  workspaceId: string,
  patch: Partial<{
    name: string
    description: string | null
    triggerType: TriggerType
    triggerConfig: Record<string, unknown>
    actionType: ActionType
    actionConfig: Record<string, unknown>
    enabled: boolean
  }>,
): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description
  if (patch.triggerType !== undefined) row.trigger_type = patch.triggerType
  if (patch.triggerConfig !== undefined) row.trigger_config = patch.triggerConfig
  if (patch.actionType !== undefined) row.action_type = patch.actionType
  if (patch.actionConfig !== undefined) row.action_config = patch.actionConfig
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  const { error } = await db
    .from('automations')
    .update(row)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  return !error
}

export async function deleteAutomation(id: string, workspaceId: string): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const { error } = await db
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
  return !error
}

// ─── Recent runs ───────────────────────────────────────────────────

export async function listRecentRuns(args: {
  workspaceId: string
  automationId?: string
  limit?: number
}): Promise<AutomationRunRow[]> {
  if (!hasValidDatabaseUrl) return []
  const limit = Math.max(1, Math.min(100, args.limit ?? 25))
  let q = db
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', args.workspaceId)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (args.automationId) q = q.eq('automation_id', args.automationId)
  const { data, error } = await q
  if (error || !data) return []
  return data as AutomationRunRow[]
}

// ─── Engine ────────────────────────────────────────────────────────

interface ActionResult {
  ok: boolean
  result: Record<string, unknown>
  error: string | null
}

function interpolate(template: string, vars: Record<string, string | number | null>): string {
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

function eventVars(event: AutomationEvent): Record<string, string | number | null> {
  if (event.type === 'decision.logged') {
    return {
      question: event.question,
      decisionType: event.decisionType,
      qualityScore: event.qualityScore,
      decisionId: event.decisionId,
      workspaceSlug: event.workspaceSlug,
    }
  }
  return {
    title: event.title,
    assignedTo: event.assignedTo,
    nodeId: event.nodeId,
    workspaceSlug: event.workspaceSlug,
  }
}

function defaultLink(event: AutomationEvent): string | null {
  if (!event.workspaceSlug) return null
  if (event.type === 'decision.logged') return `/workspace/${event.workspaceSlug}/decisions/${event.decisionId}`
  return `/workspace/${event.workspaceSlug}/tasks`
}

async function runAction(
  automation: AutomationRow,
  event: AutomationEvent,
): Promise<ActionResult> {
  const cfg = automation.action_config ?? {}
  if (automation.action_type === 'notification.send') {
    const titleTpl = typeof cfg.title === 'string' ? cfg.title : 'Automation: {{title}}'
    const bodyTpl = typeof cfg.body === 'string' ? cfg.body : ''
    const vars = eventVars(event)
    const title = interpolate(titleTpl, vars).slice(0, 200)
    const body = interpolate(bodyTpl, vars).slice(0, 500)
    await notifyWorkspaceMembers({
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      type: 'task_assigned', // any valid notification_type — automations reuse this surface
      title,
      body,
      link: defaultLink(event),
    }).catch(() => undefined)
    return { ok: true, result: { delivered: 'in_app', title }, error: null }
  }

  if (automation.action_type === 'webhook.post') {
    const url = typeof cfg.url === 'string' ? cfg.url : ''
    if (!url || !/^https:\/\//i.test(url)) {
      return { ok: false, result: {}, error: 'webhook url missing or not https' }
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          automation_id: automation.id,
          event,
        }),
        // 5 second cap so a slow webhook can't pin the request thread.
        signal: AbortSignal.timeout(5000),
      })
      return {
        ok: res.ok,
        result: { status: res.status },
        error: res.ok ? null : `webhook returned ${res.status}`,
      }
    } catch (err) {
      return { ok: false, result: {}, error: err instanceof Error ? err.message : 'webhook failed' }
    }
  }

  return { ok: false, result: {}, error: `unknown action_type: ${automation.action_type}` }
}

/**
 * Synchronous evaluator. Loads enabled automations whose `trigger_type`
 * matches the event, runs each action, and writes a run row per execution.
 * Never throws — failures end up in `automation_runs.error` instead.
 */
export async function runAutomations(event: AutomationEvent): Promise<void> {
  if (!hasValidDatabaseUrl) return
  try {
    const { data, error } = await db
      .from('automations')
      .select('*')
      .eq('workspace_id', event.workspaceId)
      .eq('trigger_type', event.type)
      .eq('enabled', true)
    if (error || !data) return

    for (const row of data as AutomationRow[]) {
      const startedAt = new Date().toISOString()
      const out = await runAction(row, event)
      const completedAt = new Date().toISOString()
      await db
        .from('automation_runs')
        .insert({
          automation_id: row.id,
          workspace_id: event.workspaceId,
          status: out.ok ? 'success' : 'failed',
          result: out.result,
          error: out.error,
          started_at: startedAt,
          completed_at: completedAt,
        })
        .then(() => undefined, () => undefined)
    }
  } catch {
    // engine-wide swallow — automation failures are best-effort
  }
}
