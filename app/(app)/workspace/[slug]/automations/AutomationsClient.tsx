'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Zap,
  Plus,
  Loader2,
  Trash2,
  Power,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

type TriggerType = 'decision.logged' | 'task.created'
type ActionType = 'notification.send' | 'webhook.post'

interface Automation {
  id: string
  workspace_id: string
  name: string
  description: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  action_type: ActionType
  action_config: Record<string, unknown>
  enabled: boolean
  created_at: string
}

interface RunRow {
  id: string
  automation_id: string | null
  status: string
  result: Record<string, unknown> | null
  error: string | null
  started_at: string
  completed_at: string | null
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  'decision.logged': 'Decision logged',
  'task.created': 'Task created',
}

const ACTION_LABELS: Record<ActionType, string> = {
  'notification.send': 'Send in-app notification',
  'webhook.post': 'POST to webhook URL',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = (now - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

interface AutomationsClientProps {
  workspaceId: string
}

export function AutomationsClient({ workspaceId }: AutomationsClientProps) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<RunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(
        `/api/v1/automations?workspaceId=${workspaceId}&includeRuns=true`,
        { cache: 'no-store' },
      )
      if (res.status === 503) {
        setError('Database is not configured. Apply the automations migration to enable this feature.')
        return
      }
      if (!res.ok) {
        setError(`Failed to load automations (HTTP ${res.status}).`)
        return
      }
      const json = (await res.json()) as { data: { automations: Automation[]; runs: RunRow[] } }
      setAutomations(json.data.automations)
      setRuns(json.data.runs)
    } catch {
      setError('Network error while loading automations.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const runsByAutomation = useMemo(() => {
    const map = new Map<string, RunRow[]>()
    for (const r of runs) {
      if (!r.automation_id) continue
      const list = map.get(r.automation_id) ?? []
      list.push(r)
      map.set(r.automation_id, list)
    }
    return map
  }, [runs])

  const onToggle = useCallback(async (a: Automation) => {
    setAutomations((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)))
    await fetch(`/api/v1/automations/${a.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: !a.enabled }),
    }).catch(() => undefined)
  }, [])

  const onDelete = useCallback(async (a: Automation) => {
    if (!confirm(`Delete automation "${a.name}"? Run history will be removed too.`)) return
    setAutomations((prev) => prev.filter((x) => x.id !== a.id))
    await fetch(`/api/v1/automations/${a.id}`, { method: 'DELETE' }).catch(() => undefined)
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Zap className="h-6 w-6 text-amber-400" />
            Automations
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            WHEN something happens, THEN run an action. Real engine — every run lands in the log below.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          New automation
        </button>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : automations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <Zap className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">No automations yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Create one and it&apos;ll fire on the next matching event.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {automations.map((a) => {
            const recent = runsByAutomation.get(a.id) ?? []
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-100">{a.name}</h3>
                      {!a.enabled && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-2xs text-slate-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="mt-1 text-xs text-slate-500">{a.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs">
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-300">
                        WHEN {TRIGGER_LABELS[a.trigger_type]}
                      </span>
                      <span className="text-slate-600">→</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-300">
                        THEN {ACTION_LABELS[a.action_type]}
                      </span>
                    </div>
                    {recent.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {recent.slice(0, 8).map((r) => (
                          <span
                            key={r.id}
                            title={`${r.status} • ${formatTime(r.started_at)}${r.error ? ` • ${r.error}` : ''}`}
                            className={
                              r.status === 'success'
                                ? 'inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs text-emerald-300'
                                : 'inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-2xs text-red-300'
                            }
                          >
                            {r.status === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {formatTime(r.started_at)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggle(a)}
                      title={a.enabled ? 'Disable' : 'Enable'}
                      className={
                        a.enabled
                          ? 'rounded-md p-2 text-emerald-400 hover:bg-slate-800'
                          : 'rounded-md p-2 text-slate-500 hover:bg-slate-800'
                      }
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(a)}
                      title="Delete"
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateAutomationDialog
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            void refetch()
          }}
        />
      )}
    </div>
  )
}

interface CreateAutomationDialogProps {
  workspaceId: string
  onClose: () => void
  onCreated: () => void
}

function CreateAutomationDialog({ workspaceId, onClose, onCreated }: CreateAutomationDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('decision.logged')
  const [actionType, setActionType] = useState<ActionType>('notification.send')
  const [notifTitle, setNotifTitle] = useState('Decision logged: {{question}}')
  const [notifBody, setNotifBody] = useState('Quality score: {{qualityScore}}')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    if (!name.trim()) {
      setErr('Name is required.')
      return
    }
    if (actionType === 'webhook.post' && !/^https:\/\//i.test(webhookUrl)) {
      setErr('Webhook URL must start with https://')
      return
    }
    setSaving(true)
    try {
      const actionConfig =
        actionType === 'notification.send'
          ? { title: notifTitle, body: notifBody }
          : { url: webhookUrl }
      const res = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: name.trim(),
          description: description.trim() || null,
          triggerType,
          triggerConfig: {},
          actionType,
          actionConfig,
          enabled: true,
        }),
      })
      if (!res.ok) {
        setErr(`Save failed (HTTP ${res.status}).`)
        return
      }
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="text-lg font-semibold text-slate-50">New automation</h2>
        <p className="mt-1 text-xs text-slate-500">
          Templates support <code className="rounded bg-slate-800 px-1">{'{{variable}}'}</code> from the trigger event.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Notify team on new decision"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this automation does"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">WHEN (trigger)</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            >
              <option value="decision.logged">Decision logged</option>
              <option value="task.created">Task created</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">THEN (action)</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
            >
              <option value="notification.send">Send in-app notification</option>
              <option value="webhook.post">POST to webhook URL</option>
            </select>
          </div>

          {actionType === 'notification.send' ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-300">Notification title</label>
                <input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Notification body</label>
                <input
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-300">Webhook URL (https only)</label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhooks/lazynext"
                className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand"
              />
              <p className="mt-1 text-2xs text-slate-500">
                We POST `{`{ automation_id, event }`}` JSON. 5s timeout per call.
              </p>
            </div>
          )}

          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
