'use client'

import { useState } from 'react'
import { Activity, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Tab = 'feed' | 'audit'

const feedItems = [
  { actor: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500', action: 'completed', target: 'Fix auth redirect bug', type: 'task', typeColor: 'bg-blue-500', time: '2 hours ago', detail: null },
  { actor: 'Priya Shah', initials: 'PS', color: 'bg-emerald-500', action: 'decided', target: 'Use Supabase for database', type: 'decision', typeColor: 'bg-orange-500', time: '4 hours ago', detail: 'Quality score: 91' },
  { actor: 'Rahul Dev', initials: 'RD', color: 'bg-amber-500', action: 'replied in', target: 'Pricing strategy thread', type: 'thread', typeColor: 'bg-purple-500', time: '5 hours ago', detail: '"I think $9 is the right entry point for startups..."' },
  { actor: 'Sana Malik', initials: 'SM', color: 'bg-pink-500', action: 'created', target: 'API Design Spec v3', type: 'doc', typeColor: 'bg-emerald-500', time: 'Yesterday', detail: null },
  { actor: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500', action: 'updated', target: 'Ship onboarding v2', type: 'task', typeColor: 'bg-blue-500', time: 'Yesterday', detail: 'Status: In Progress → Review' },
  { actor: 'Priya Shah', initials: 'PS', color: 'bg-emerald-500', action: 'moved', target: 'Design tokens doc', type: 'doc', typeColor: 'bg-emerald-500', time: '2 days ago', detail: null },
  { actor: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500', action: 'tagged outcome', target: 'Choose auth provider', type: 'decision', typeColor: 'bg-orange-500', time: '2 days ago', detail: 'Outcome: Good ✓' },
]

const auditRows = [
  { time: 'Apr 5, 2:14 PM', dateTime: '2026-04-05T14:14', user: 'Avas Patel', action: 'created', target: 'Task: Fix auth bug', detail: 'Priority: High', ip: '103.xx.xx.42', badge: 'bg-blue-500/10 text-blue-400' },
  { time: 'Apr 5, 11:30 AM', dateTime: '2026-04-05T11:30', user: 'Priya Shah', action: 'decided', target: 'Decision: Use Supabase', detail: 'Score: 91', ip: '103.xx.xx.42', badge: 'bg-orange-500/10 text-orange-400' },
  { time: 'Apr 5, 9:15 AM', dateTime: '2026-04-05T09:15', user: 'Rahul Dev', action: 'replied', target: 'Thread: Pricing', detail: 'Comment #4', ip: '49.xx.xx.88', badge: 'bg-purple-500/10 text-purple-400' },
  { time: 'Apr 4, 4:05 PM', dateTime: '2026-04-04T16:05', user: 'Sana Malik', action: 'created', target: 'Doc: API Spec v3', detail: '12 sections', ip: '103.xx.xx.42', badge: 'bg-emerald-500/10 text-emerald-400' },
  { time: 'Apr 4, 2:30 PM', dateTime: '2026-04-04T14:30', user: 'Avas Patel', action: 'updated', target: 'Task: Ship onboarding', detail: 'Status change', ip: '103.xx.xx.42', badge: 'bg-amber-500/10 text-amber-400' },
  { time: 'Apr 3, 11:00 AM', dateTime: '2026-04-03T11:00', user: 'Avas Patel', action: 'deleted', target: 'Task: Old prototype', detail: 'Permanently removed', ip: '103.xx.xx.42', badge: 'bg-red-500/10 text-red-400' },
  { time: 'Apr 3, 9:00 AM', dateTime: '2026-04-03T09:00', user: 'Priya Shah', action: 'invited', target: 'new@team.com', detail: 'Role: Member', ip: '103.xx.xx.42', badge: 'bg-blue-500/10 text-blue-400' },
]

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>('feed')
  const [page, setPage] = useState(1)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Activity className="h-6 w-6 text-brand" />
            Activity
          </h1>
          <p className="mt-1 text-sm text-slate-400">Track everything that happens in your workspace.</p>
        </div>
        {tab === 'audit' && (
          <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"><Download className="h-3 w-3" /> Export CSV</button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 w-fit">
        <button onClick={() => setTab('feed')} className={cn('rounded-md px-4 py-2 text-sm font-medium', tab === 'feed' ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}>Feed</button>
        <button onClick={() => setTab('audit')} className={cn('rounded-md px-4 py-2 text-sm font-medium', tab === 'audit' ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}>Audit Log</button>
      </div>

      {/* Feed */}
      {tab === 'feed' && (
        <div className="mt-6">
          <p className="text-2xs uppercase tracking-wider text-slate-500 mb-3">Today</p>
          <div className="relative ml-4 border-l border-slate-800 pl-6 space-y-5">
            {feedItems.slice(0, 3).map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[33px] flex items-center">
                  <div className={cn('relative flex h-8 w-8 items-center justify-center rounded-full text-2xs font-bold text-white', item.color)}>
                    {item.initials}
                    <div className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950', item.typeColor)} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    <strong className="text-slate-100">{item.actor}</strong> {item.action} <button className="font-medium text-brand hover:underline">{item.target}</button>
                  </p>
                  {item.detail && (
                    <div className="mt-1 rounded-md bg-slate-800/50 border-l-2 border-slate-700 px-3 py-2 text-xs text-slate-400">
                      {item.detail}
                    </div>
                  )}
                  <p className="mt-1 text-2xs text-slate-600">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-2xs uppercase tracking-wider text-slate-500 mt-6 mb-3">Yesterday</p>
          <div className="relative ml-4 border-l border-slate-800 pl-6 space-y-5">
            {feedItems.slice(3).map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[33px] flex items-center">
                  <div className={cn('relative flex h-8 w-8 items-center justify-center rounded-full text-2xs font-bold text-white', item.color)}>
                    {item.initials}
                    <div className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950', item.typeColor)} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    <strong className="text-slate-100">{item.actor}</strong> {item.action} <button className="font-medium text-brand hover:underline">{item.target}</button>
                  </p>
                  {item.detail && (
                    <div className="mt-1 rounded-md bg-slate-800/50 border-l-2 border-slate-700 px-3 py-2 text-xs text-slate-400">
                      {item.detail}
                    </div>
                  )}
                  <p className="mt-1 text-2xs text-slate-600">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 text-xs text-brand hover:text-brand-hover">View full activity log →</button>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400"><Filter className="h-3 w-3" /> Filter</button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-2xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap"><time dateTime={row.dateTime}>{row.time}</time></td>
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">{row.user}</td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium capitalize', row.badge)}>{row.action}</span></td>
                    <td className="px-4 py-3 text-slate-300">{row.target}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.detail}</td>
                    <td className="px-4 py-3 text-2xs text-slate-600 font-mono">{row.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Showing 1-7 of 156 entries</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page" className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 disabled:opacity-50"><ChevronLeft className="h-3 w-3" /></button>
              <span className="text-xs text-slate-400 px-2">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} aria-label="Next page" className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400"><ChevronRight className="h-3 w-3" /></button>
            </div>
          </div>
          <p className="mt-2 text-2xs text-slate-600">IP addresses are partially masked for privacy.</p>
        </div>
      )}
    </div>
  )
}
