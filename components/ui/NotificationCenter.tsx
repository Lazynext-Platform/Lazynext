'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { cn } from '@/lib/utils/cn'

type NotifType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'decision_logged'
  | 'decision_outcome_pending'
  | 'thread_mention'
  | 'thread_reply'
  | 'workspace_invite'

interface ApiNotification {
  id: string
  workspace_id: string
  user_id: string
  actor_id: string | null
  type: NotifType
  title: string
  body: string | null
  link: string | null
  related_node_id: string | null
  related_decision_id: string | null
  related_thread_id: string | null
  read_at: string | null
  created_at: string
  actor: {
    id: string | null
    name: string | null
    email: string | null
    avatarUrl: string | null
  } | null
}

const typeBadge: Record<NotifType, { label: string; color: string }> = {
  task_assigned: { label: 'TASK', color: 'text-blue-400 bg-blue-500/10' },
  task_due_soon: { label: 'TASK', color: 'text-blue-400 bg-blue-500/10' },
  decision_logged: { label: 'DECISION', color: 'text-orange-400 bg-orange-500/10' },
  decision_outcome_pending: { label: 'DECISION', color: 'text-orange-400 bg-orange-500/10' },
  thread_mention: { label: 'THREAD', color: 'text-purple-400 bg-purple-500/10' },
  thread_reply: { label: 'THREAD', color: 'text-purple-400 bg-purple-500/10' },
  workspace_invite: { label: 'INVITE', color: 'text-emerald-400 bg-emerald-500/10' },
}

function initialsFor(actor: ApiNotification['actor']): string {
  if (!actor) return '·'
  const source = (actor.name || actor.email || '').trim()
  if (!source) return '·'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function actorLabel(actor: ApiNotification['actor']): string {
  if (!actor) return 'Lazynext'
  return actor.name || actor.email || 'Someone'
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function groupOf(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return 'Earlier'
}

export function NotificationCenter() {
  const isNotificationOpen = useUIStore((s) => s.isNotificationOpen)
  const toggleNotification = useUIStore((s) => s.toggleNotification)
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id ?? null)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = items.filter((n) => !n.read_at).length
  const filtered = tab === 'unread' ? items.filter((n) => !n.read_at) : items
  const todayItems = filtered.filter((n) => groupOf(n.created_at) === 'Today')
  const yesterdayItems = filtered.filter((n) => groupOf(n.created_at) === 'Yesterday')
  const earlierItems = filtered.filter((n) => groupOf(n.created_at) === 'Earlier')

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/notifications?workspaceId=${workspaceId}`)
      if (!res.ok) {
        if (res.status === 503) setError('Notifications backend is not configured.')
        else setError('Failed to load notifications.')
        setItems([])
        return
      }
      const json = (await res.json()) as { data: ApiNotification[] }
      setItems(json.data ?? [])
    } catch {
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  // Refresh on open + 60s background poll while a workspace is hydrated.
  useEffect(() => {
    if (isNotificationOpen) void load()
  }, [isNotificationOpen, load])

  useEffect(() => {
    if (!workspaceId) return
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => clearInterval(interval)
  }, [workspaceId, load])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isNotificationOpen) toggleNotification()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isNotificationOpen, toggleNotification])

  const markAllRead = async () => {
    if (!workspaceId) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceId, action: 'mark_all_read' }),
      })
    } catch { void load() }
  }

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)))
    try { await fetch(`/api/v1/notifications/${id}`, { method: 'PATCH' }) } catch { void load() }
  }

  const renderRow = (n: ApiNotification, faded: boolean) => {
    const inner = (
      <>
        {!n.read_at && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-2xs font-bold text-white">
          {initialsFor(n.actor)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm', faded ? 'text-slate-400' : 'text-slate-300')}>
            <span className={cn('font-medium', faded ? 'text-slate-300' : 'text-slate-200')}>{actorLabel(n.actor)}</span>{' '}
            {n.title}
            {n.body ? <span className="text-slate-400"> — {n.body}</span> : null}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn('rounded-full px-1.5 py-0.5 text-3xs font-medium', typeBadge[n.type].color)}>
              {typeBadge[n.type].label}
            </span>
            <span className="text-2xs text-slate-500">{relativeTime(n.created_at)}</span>
          </div>
        </div>
      </>
    )
    const className = cn(
      'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-800/50',
      !n.read_at && 'bg-brand/5'
    )
    if (n.link) {
      return (
        <Link key={n.id} href={n.link} onClick={() => { void markRead(n.id); toggleNotification() }} className={className}>
          {inner}
        </Link>
      )
    }
    return (
      <button key={n.id} type="button" onClick={() => void markRead(n.id)} className={cn(className, 'w-full text-left')}>
        {inner}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggleNotification} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} className="relative rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-3xs font-bold text-white motion-safe:animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isNotificationOpen && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-10 z-50 w-96 motion-safe:animate-scaleIn rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
            <h3 id="notif-title" className="flex-1 text-sm font-semibold text-slate-200">Notifications</h3>
            <div role="tablist" className="flex items-center gap-1 rounded-lg bg-slate-800 p-0.5">
              <button role="tab" aria-selected={tab === 'all'} onClick={() => setTab('all')} className={cn('rounded-md px-2.5 py-1 text-2xs+ font-medium transition-colors', tab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300')}>All</button>
              <button role="tab" aria-selected={tab === 'unread'} onClick={() => setTab('unread')} className={cn('rounded-md px-2.5 py-1 text-2xs+ font-medium transition-colors', tab === 'unread' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300')}>Unread</button>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-2xs+ text-brand hover:text-brand-hover transition-colors">
                <CheckCheck className="h-3 w-3" />Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto scrollbar-thin" aria-live="polite">
            {loading && filtered.length === 0 && (
              <div className="px-6 py-12 text-center text-xs text-slate-500">Loading…</div>
            )}
            {!loading && error && (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-amber-300">{error}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Run the latest Supabase migration (<code className="rounded bg-slate-800 px-1 py-0.5">notifications</code> table) to enable the bell.
                </p>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCheck className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-300">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-slate-500">
                  Notifications appear here when teammates assign you tasks or log decisions.
                </p>
              </div>
            )}
            {todayItems.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-widest text-slate-500">Today</p>
                {todayItems.map((n) => renderRow(n, false))}
              </>
            )}
            {yesterdayItems.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-widest text-slate-500">Yesterday</p>
                {yesterdayItems.map((n) => renderRow(n, true))}
              </>
            )}
            {earlierItems.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-widest text-slate-500">Earlier</p>
                {earlierItems.map((n) => renderRow(n, true))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
