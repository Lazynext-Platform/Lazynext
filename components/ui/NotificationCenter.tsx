'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'

type NotifType = 'task' | 'decision' | 'thread' | 'ai' | 'automation' | 'pulse'

interface Notification {
  id: string
  actor: string
  initials: string
  avatarColor: string
  action: string
  type: NotifType
  time: string
  unread: boolean
  group: 'Today' | 'Yesterday'
}

const typeBadge: Record<NotifType, { label: string; color: string }> = {
  task: { label: 'TASK', color: 'text-blue-400 bg-blue-500/10' },
  decision: { label: 'DECISION', color: 'text-orange-400 bg-orange-500/10' },
  thread: { label: 'THREAD', color: 'text-purple-400 bg-purple-500/10' },
  ai: { label: 'AI INSIGHT', color: 'text-blue-400 bg-blue-500/10' },
  automation: { label: 'AUTO', color: 'text-emerald-400 bg-emerald-500/10' },
  pulse: { label: 'PULSE', color: 'text-cyan-400 bg-cyan-500/10' },
}

// No notifications table exists in the current schema. Until one ships,
// this list is intentionally empty — better an honest "all caught up"
// than fabricated activity attributed to people who don't exist.
const notifications: Notification[] = []

export function NotificationCenter() {
  const isNotificationOpen = useUIStore((s) => s.isNotificationOpen)
  const toggleNotification = useUIStore((s) => s.toggleNotification)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState(notifications)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = items.filter((n) => n.unread).length
  const filtered = tab === 'unread' ? items.filter((n) => n.unread) : items
  const todayItems = filtered.filter((n) => n.group === 'Today')
  const yesterdayItems = filtered.filter((n) => n.group === 'Yesterday')

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

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button onClick={toggleNotification} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} className="relative rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-3xs font-bold text-white motion-safe:animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isNotificationOpen && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-10 z-50 w-96 motion-safe:animate-scaleIn rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {/* Header */}
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

          {/* Items */}
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin" aria-live="polite">
            {filtered.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCheck className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-300">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-slate-500">
                  Notifications will appear here when teammates assign you tasks, mention you, or log decisions.
                </p>
              </div>
            )}
            {todayItems.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-widest text-slate-500">Today</p>
                {todayItems.map((n) => (
                  <div key={n.id} className={cn('flex items-start gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer', n.unread && 'bg-brand/5')}>
                    {n.unread && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', n.avatarColor)}>{n.initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-300"><span className="font-medium text-slate-200">{n.actor}</span> {n.action}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn('rounded-full px-1.5 py-0.5 text-3xs font-medium', typeBadge[n.type].color)}>{typeBadge[n.type].label}</span>
                        <span className="text-2xs text-slate-500">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {yesterdayItems.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-2xs font-semibold uppercase tracking-widest text-slate-500">Yesterday</p>
                {yesterdayItems.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', n.avatarColor)}>{n.initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-400"><span className="font-medium text-slate-300">{n.actor}</span> {n.action}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={cn('rounded-full px-1.5 py-0.5 text-3xs font-medium', typeBadge[n.type].color)}>{typeBadge[n.type].label}</span>
                        <span className="text-2xs text-slate-500">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer removed in v1.3.3.2 — the "View all notifications"
              button had no onClick handler and there is no /notifications
              route to render. The bell dropdown is the full surface. */}
        </div>
      )}
    </div>
  )
}
