'use client'

import { useState } from 'react'
import {
  Zap,
  Plus,
  Trash2,
  Check,
  X,
  ArrowDown,
  Save,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type View = 'list' | 'builder'

const sampleAutomations = [
  { id: '1', name: 'Auto-assign new tasks', desc: 'When a TASK is created, assign to least-busy member', active: true, trigger: 'On node create', runs: 24, icon: '⚡', color: 'bg-blue-500/10' },
  { id: '2', name: 'Decision reminder', desc: 'When DECISION is open > 7 days, send notification', active: true, trigger: 'On schedule', runs: 8, icon: '🔔', color: 'bg-orange-500/10' },
  { id: '3', name: 'Weekly digest', desc: 'Every Monday, compile and send team digest email', active: true, trigger: 'On schedule', runs: 12, icon: '📧', color: 'bg-emerald-500/10' },
  { id: '4', name: 'Blocked task alert', desc: 'When task is blocked for > 2 days, notify assignee', active: false, trigger: 'On status change', runs: 3, icon: '🚨', color: 'bg-red-500/10' },
]

const triggerTypes = ['When node is created', 'When status changes', 'When quality score < threshold', 'On schedule (cron)', 'When node is deleted']
const actionTypes = ['Send notification', 'Assign to member', 'Change status', 'Create node', 'Send email', 'Add tag', 'Log to activity']
const nodeTypes = ['Any', 'TASK', 'DOC', 'DECISION', 'THREAD']
const statuses = ['Any', 'Open', 'In Progress', 'Done', 'Blocked']

const runHistory = [
  { time: 'Apr 5, 2:14 PM', event: 'TASK "Fix auth bug" created', status: 'success', detail: 'Assigned to Priya Shah' },
  { time: 'Apr 5, 11:30 AM', event: 'TASK "Update API docs" created', status: 'success', detail: 'Assigned to Rahul Dev' },
  { time: 'Apr 4, 4:05 PM', event: 'TASK "Deploy staging" created', status: 'failed', detail: 'No available member to assign' },
  { time: 'Apr 4, 9:22 AM', event: 'TASK "Review PR #42" created', status: 'success', detail: 'Assigned to Avas Patel' },
]

export default function AutomationsPage() {
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [automations, setAutomations] = useState(sampleAutomations)
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'paused'>('all')
  const [actions, setActions] = useState([{ type: 'Send notification', config: '' }])

  const filtered = automations.filter(a => {
    if (filterMode === 'active') return a.active
    if (filterMode === 'paused') return !a.active
    return true
  })

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  const selected = automations.find(a => a.id === selectedId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {view === 'list' ? (
        <>
          {/* List Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
                <Zap className="h-6 w-6 text-amber-400" />
                Automations
              </h1>
              <p className="mt-1 text-sm text-slate-400">Active Automations ({automations.filter(a => a.active).length})</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              <Plus className="h-4 w-4" /> New Automation
            </button>
          </div>

          {/* Filter pills */}
          <div className="mt-4 flex gap-1">
            {(['all', 'active', 'paused'] as const).map((f) => (
              <button key={f} onClick={() => setFilterMode(f)} className={cn('rounded-md px-3 py-1 text-2xs font-medium capitalize transition-colors', filterMode === f ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200')}>
                {f}
              </button>
            ))}
          </div>

          {/* Automation cards */}
          <div className="mt-4 space-y-3">
            {filtered.map((auto) => (
              <div key={auto.id} role="button" tabIndex={0} className={cn('flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 transition-all cursor-pointer hover:border-slate-700', !auto.active && 'opacity-70')} onClick={() => { setSelectedId(auto.id); setView('builder') }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(auto.id); setView('builder') } }}>
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-lg', auto.color)}>{auto.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{auto.name}</p>
                      {!auto.active && <span className="rounded-full bg-slate-700 px-2 py-0.5 text-3xs text-slate-400">Paused</span>}
                    </div>
                    <p className="text-xs text-slate-500">{auto.desc}</p>
                    <p className="text-2xs text-slate-600 mt-0.5">{auto.trigger} · {auto.runs} runs</p>
                  </div>
                </div>
                <label className="relative" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={auto.active} onChange={() => toggleAutomation(auto.id)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-emerald-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Builder View */}
          <button onClick={() => setView('list')} className="mb-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> Back to automations
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input defaultValue={selected?.name || 'New Automation'} aria-label="Automation name" className="bg-transparent text-xl font-bold text-slate-100 border-b border-transparent focus:border-brand focus:outline-none" />
              <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', selected?.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400')}>{selected?.active ? 'Active' : 'Paused'}</span>
            </div>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Save className="inline h-3.5 w-3.5 mr-1" /> Save</button>
          </div>

          {/* WHEN trigger */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">W</div>
              <span className="text-sm font-semibold text-slate-200">WHEN</span>
            </div>
            <div className="ml-9 mt-3 rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
              <select aria-label="Trigger type" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                {triggerTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select aria-label="Node type" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                  {nodeTypes.map(t => <option key={t}>{t}</option>)}
                </select>
                <select aria-label="Status" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                  {statuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Connector */}
          <div className="ml-9 flex flex-col items-start">
            <div className="h-8 w-px bg-slate-700" />
            <ArrowDown className="h-4 w-4 text-slate-600 -mt-1" />
          </div>

          {/* THEN actions */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">T</div>
              <span className="text-sm font-semibold text-slate-200">THEN</span>
            </div>
            <div className="ml-9 mt-3 space-y-3">
              {actions.map((action, i) => (
                <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xs font-medium text-slate-500">Action {i + 1}</span>
                    {actions.length > 1 && <button onClick={() => setActions(actions.filter((_, j) => j !== i))} aria-label={`Remove action ${i + 1}`} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>}
                  </div>
                  <select defaultValue={action.type} aria-label={`Action ${i + 1} type`} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none">
                    {actionTypes.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <textarea placeholder="Message template (use {{node.title}}, {{node.assignee}}...)" aria-label={`Action ${i + 1} message template`} rows={2} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none" />
                </div>
              ))}
              <button onClick={() => setActions([...actions, { type: 'Send notification', config: '' }])} className="w-full rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors">+ Add action</button>
            </div>
          </div>

          {/* Run History */}
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-semibold text-slate-200">Run History</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500">
                    <th className="py-2 text-left font-medium">Triggered At</th>
                    <th className="py-2 text-left font-medium">Event</th>
                    <th className="py-2 text-center font-medium">Status</th>
                    <th className="py-2 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {runHistory.map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-3 text-slate-500 text-xs">{r.time}</td>
                      <td className="py-3 text-slate-300">{r.event}</td>
                      <td className="py-3 text-center">{r.status === 'success' ? <Check className="inline h-4 w-4 text-emerald-400" /> : <X className="inline h-4 w-4 text-red-400" />}</td>
                      <td className={cn('py-3 text-xs', r.status === 'success' ? 'text-slate-400' : 'text-red-400')}>{r.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
