'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type NotifType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'decision_logged'
  | 'decision_outcome_pending'
  | 'thread_mention'
  | 'thread_reply'
  | 'workspace_invite'

interface Preference {
  type: NotifType
  in_app: boolean
  email: boolean
}

const LABELS: Record<NotifType, { title: string; sub: string }> = {
  task_assigned: { title: 'Task assigned to you', sub: 'When a teammate assigns a task to you.' },
  task_due_soon: { title: 'Task due in the next 24 hours', sub: 'A daily reminder for upcoming due dates.' },
  decision_logged: { title: 'New decision logged in this workspace', sub: 'Anyone in the workspace logs a decision.' },
  decision_outcome_pending: { title: 'Decision outcome needs tagging', sub: 'When `expected_by` has passed without an outcome.' },
  thread_mention: { title: 'You were @mentioned in a thread', sub: 'A teammate tags you in a comment.' },
  thread_reply: { title: 'New reply in a thread you started', sub: 'Replies on your own threads.' },
  workspace_invite: { title: 'You were invited to a workspace', sub: 'You receive a workspace invitation.' },
}

const ORDER: NotifType[] = [
  'task_assigned',
  'task_due_soon',
  'decision_logged',
  'decision_outcome_pending',
  'thread_mention',
  'thread_reply',
  'workspace_invite',
]

export function NotificationsTab({ workspaceId }: { workspaceId: string | null }) {
  const [prefs, setPrefs] = useState<Preference[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/notification-preferences?workspaceId=${workspaceId}`)
        if (!res.ok) {
          if (res.status === 503) setError('Notifications backend is not configured.')
          else setError('Failed to load preferences.')
          return
        }
        const json = (await res.json()) as { data: Preference[] }
        if (!cancelled) setPrefs(json.data ?? [])
      } catch {
        if (!cancelled) setError('Failed to load preferences.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [workspaceId])

  const toggle = (type: NotifType, key: 'in_app' | 'email') => {
    setPrefs((prev) => prev.map((p) => (p.type === type ? { ...p, [key]: !p[key] } : p)))
    setSaved(false)
  }

  const save = async () => {
    if (!workspaceId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/notification-preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId, preferences: prefs }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError((json as { message?: string } | null)?.message ?? 'Save failed.')
        return
      }
      const json = (await res.json()) as { data: { preferences: Preference[] } }
      setPrefs(json.data.preferences)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const ordered = ORDER.map((t) => prefs.find((p) => p.type === t)).filter((p): p is Preference => !!p)

  return (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-start gap-3">
        <Bell className="mt-1 h-5 w-5 text-brand" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-100">Notification Preferences</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose which events trigger an in-app notification (the bell in the top bar) for this workspace.
            Email delivery is on the roadmap and the toggles are stored, but no email is sent yet.
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> Loading preferences…
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && ordered.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-2 text-2xs+ font-semibold uppercase tracking-widest text-slate-500 sm:grid-cols-[1fr_auto_auto]">
            <span>Event</span>
            <span className="hidden text-center sm:block">In-app</span>
            <span className="hidden text-center sm:block">Email</span>
          </div>
          <div className="mt-2 space-y-2">
            {ordered.map((p) => (
              <div
                key={p.type}
                className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:gap-6"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{LABELS[p.type].title}</p>
                  <p className="text-xs text-slate-500">{LABELS[p.type].sub}</p>
                </div>
                <Toggle
                  label="In-app"
                  on={p.in_app}
                  onChange={() => toggle(p.type, 'in_app')}
                />
                <Toggle
                  label="Email"
                  on={p.email}
                  onChange={() => toggle(p.type, 'email')}
                  disabled
                  hint="Email delivery is not yet wired"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !workspaceId}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> : null}
              Save preferences
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  disabled,
  hint,
}: {
  label: string
  on: boolean
  onChange: () => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:justify-center">
      <span className="text-2xs+ font-medium uppercase tracking-widest text-slate-500 sm:hidden">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={hint ? `${label} (${hint})` : label}
        disabled={disabled}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          on ? 'bg-brand' : 'bg-slate-700',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            on ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
