'use client'

import { useState } from 'react'
import { LayoutGrid, List, Plus, Filter, ArrowUpDown, CheckSquare, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ViewMode = 'board' | 'list'
type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'

const tasks = [
  { id: '1', title: 'Fix auth redirect bug', status: 'done' as TaskStatus, priority: 'high', assignee: 'AP', due: 'Apr 3', progress: 100, desc: 'OAuth callback not redirecting to workspace' },
  { id: '2', title: 'Ship onboarding v2', status: 'in-progress' as TaskStatus, priority: 'high', assignee: 'AP', due: 'Apr 7', progress: 65, desc: 'New 3-step wizard with score reveal' },
  { id: '3', title: 'Update API docs', status: 'in-progress' as TaskStatus, priority: 'medium', assignee: 'RD', due: 'Apr 9', progress: 40, desc: 'Document all REST endpoints' },
  { id: '4', title: 'Design email templates', status: 'todo' as TaskStatus, priority: 'medium', assignee: 'PS', due: 'Apr 12', progress: 0, desc: 'Transactional email designs' },
  { id: '5', title: 'Write migration guide', status: 'todo' as TaskStatus, priority: 'low', assignee: 'SM', due: 'Apr 14', progress: 0, desc: 'Guide for users migrating from Notion' },
  { id: '6', title: 'Review PR #42', status: 'review' as TaskStatus, priority: 'high', assignee: 'AP', due: 'Apr 5', progress: 80, desc: 'Canvas performance improvements' },
  { id: '7', title: 'Deploy staging environment', status: 'todo' as TaskStatus, priority: 'high', assignee: 'RD', due: 'Apr 8', progress: 0, desc: 'Set up staging on Vercel' },
  { id: '8', title: 'Add decision quality API', status: 'review' as TaskStatus, priority: 'medium', assignee: 'AP', due: 'Apr 6', progress: 90, desc: 'POST /api/v1/decisions/score' },
  { id: '9', title: 'Finalize pricing model', status: 'done' as TaskStatus, priority: 'high', assignee: 'AP', due: 'Mar 30', progress: 100, desc: 'INR pricing approved' },
  { id: '10', title: 'Set up Razorpay integration', status: 'in-progress' as TaskStatus, priority: 'medium', assignee: 'PS', due: 'Apr 10', progress: 30, desc: 'INR domestic payments' },
]

const columns: { status: TaskStatus; label: string; dotColor: string }[] = [
  { status: 'todo', label: 'To Do', dotColor: 'bg-slate-400' },
  { status: 'in-progress', label: 'In Progress', dotColor: 'bg-blue-400' },
  { status: 'review', label: 'Review', dotColor: 'bg-amber-400' },
  { status: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
]

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400',
  medium: 'bg-blue-500/10 text-blue-400',
  low: 'bg-slate-500/10 text-slate-400',
}

const avatarColors: Record<string, string> = {
  AP: 'bg-indigo-500', PS: 'bg-emerald-500', RD: 'bg-amber-500', SM: 'bg-pink-500',
}

export default function TasksPage() {
  const [view, setView] = useState<ViewMode>('board')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-full px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-400">{tasks.length} tasks · {tasks.filter(t => t.status === 'done').length} completed</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button onClick={() => setView('board')} className={cn('rounded-md px-2.5 py-1.5 transition-colors', view === 'board' ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView('list')} className={cn('rounded-md px-2.5 py-1.5 transition-colors', view === 'list' ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200')}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"><Filter className="h-3 w-3" /> Filter</button>
          <button className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"><ArrowUpDown className="h-3 w-3" /> Sort</button>
          <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Plus className="h-4 w-4" /> Add Task</button>
        </div>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.status)
            return (
              <div key={col.status} className={cn('w-72 shrink-0 rounded-xl border border-slate-800 bg-slate-900/50 p-3', col.status === 'done' && 'opacity-60')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full', col.dotColor)} />
                    <span className="text-sm font-semibold text-slate-200">{col.label}</span>
                    <span className="text-xs text-slate-500">{colTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div key={task.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 hover:border-slate-700 cursor-pointer transition-all hover:-translate-y-0.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', priorityStyles[task.priority])}>{task.priority}</span>
                        <div className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white', avatarColors[task.assignee])}>{task.assignee}</div>
                      </div>
                      <p className={cn('text-sm font-medium', col.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100')}>{task.title}</p>
                      {task.desc && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.desc}</p>}
                      {task.progress > 0 && task.progress < 100 && (
                        <div className="mt-2 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-1 rounded-full bg-brand" style={{ width: `${task.progress}%` }} />
                        </div>
                      )}
                      {task.due && <p className="mt-2 text-[10px] text-slate-500">Due {task.due}</p>}
                    </div>
                  ))}
                  <button className="w-full rounded-lg border border-dashed border-slate-700 py-2 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-400">+ Add task</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-12 items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <span className="col-span-1"><input type="checkbox" className="rounded border-slate-600" /></span>
            <span className="col-span-4">Task</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1">Priority</span>
            <span className="col-span-2">Assignee</span>
            <span className="col-span-2">Due Date</span>
          </div>
          {tasks.map(task => (
            <div key={task.id} className={cn('grid grid-cols-12 items-center gap-2 border-b border-slate-800/50 px-4 py-3 last:border-0 hover:bg-slate-800/30 transition-colors', selected.has(task.id) && 'bg-brand/5')}>
              <span className="col-span-1"><input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} className="rounded border-slate-600" /></span>
              <span className={cn('col-span-4 text-sm font-medium', task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100')}>{task.title}</span>
              <span className="col-span-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                  task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                  task.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' :
                  task.status === 'review' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-500/10 text-slate-400'
                )}>{task.status.replace('-', ' ')}</span>
              </span>
              <span className="col-span-1"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', priorityStyles[task.priority])}>{task.priority}</span></span>
              <span className="col-span-2 flex items-center gap-1.5">
                <div className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white', avatarColors[task.assignee])}>{task.assignee}</div>
                <span className="text-xs text-slate-400">{task.assignee}</span>
              </span>
              <span className="col-span-2 text-xs text-slate-500">{task.due}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
