'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, List, Plus, CheckSquare, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Node } from '@/lib/db/schema'
import type { MemberUser } from '@/lib/data/workspace'

type ViewMode = 'board' | 'list'
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

const columns: { status: TaskStatus; label: string; dotColor: string }[] = [
  { status: 'todo', label: 'To Do', dotColor: 'bg-slate-400' },
  { status: 'in_progress', label: 'In Progress', dotColor: 'bg-blue-400' },
  { status: 'in_review', label: 'Review', dotColor: 'bg-amber-400' },
  { status: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
]

interface Props {
  workspaceId: string
  workflowId: string
  tasks: Node[]
  members: MemberUser[]
}

export function TasksClient({ workspaceId, workflowId, tasks: initialTasks, members }: Props) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('board')
  const [tasks, setTasks] = useState(initialTasks)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const memberById = new Map(members.map((m) => [m.userId, m]))

  function handleStatusChange(id: string, status: TaskStatus) {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    startTransition(async () => {
      await fetch(`/api/v1/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    })
  }

  function handleCreated(node: Node) {
    setTasks((prev) => [node, ...prev])
    setIsAddOpen(false)
    router.refresh()
  }

  const totalDone = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="max-w-full px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · {totalDone} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button
              onClick={() => setView('board')}
              aria-label="Board view"
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                view === 'board' ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                view === 'list' ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState onAdd={() => setIsAddOpen(true)} />
      ) : view === 'board' ? (
        <BoardView tasks={tasks} memberById={memberById} onStatus={handleStatusChange} pending={pending} />
      ) : (
        <ListView tasks={tasks} memberById={memberById} />
      )}

      {isAddOpen && (
        <AddTaskModal
          workspaceId={workspaceId}
          workflowId={workflowId}
          members={members}
          onClose={() => setIsAddOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
      <CheckSquare className="mx-auto h-12 w-12 text-slate-600" />
      <p className="mt-4 text-base font-medium text-slate-200">No tasks yet</p>
      <p className="mt-1 text-sm text-slate-500">
        Create your first task to start tracking work in this workspace.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" /> Add your first task
      </button>
    </div>
  )
}

function BoardView({
  tasks,
  memberById,
  onStatus,
  pending,
}: {
  tasks: Node[]
  memberById: Map<string, MemberUser>
  onStatus: (id: string, s: TaskStatus) => void
  pending: boolean
}) {
  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => (t.status ?? 'todo') === col.status)
        return (
          <div
            key={col.status}
            className={cn(
              'w-72 shrink-0 rounded-xl border border-slate-800 bg-slate-900/50 p-3',
              col.status === 'done' && 'opacity-70',
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', col.dotColor)} />
                <span className="text-sm font-semibold text-slate-200">{col.label}</span>
                <span className="text-xs text-slate-500">{colTasks.length}</span>
              </div>
              {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
            </div>
            <div className="space-y-2">
              {colTasks.map((task) => (
                <TaskCard key={task.id} task={task} memberById={memberById} onStatus={onStatus} />
              ))}
              {colTasks.length === 0 && (
                <p className="px-2 py-3 text-2xs text-slate-600">No tasks here.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({
  task,
  memberById,
  onStatus,
}: {
  task: Node
  memberById: Map<string, MemberUser>
  onStatus: (id: string, s: TaskStatus) => void
}) {
  const assignee = task.assigned_to ? memberById.get(task.assigned_to) : null
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 transition-all hover:-translate-y-0.5 hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-sm font-medium', task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100')}>
          {task.title}
        </p>
        {assignee && (
          <span
            title={assignee.name || assignee.email || 'Member'}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-4xs font-bold text-white"
          >
            {assignee.initials}
          </span>
        )}
      </div>
      {task.due_at && (
        <p className="mt-2 text-2xs text-slate-500">
          Due {new Date(task.due_at).toLocaleDateString()}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {columns
          .filter((c) => c.status !== (task.status ?? 'todo'))
          .map((c) => (
            <button
              key={c.status}
              onClick={() => onStatus(task.id, c.status)}
              className="rounded border border-slate-800 px-1.5 py-0.5 text-2xs text-slate-500 hover:border-slate-700 hover:text-slate-300"
            >
              → {c.label}
            </button>
          ))}
      </div>
    </div>
  )
}

function ListView({ tasks, memberById }: { tasks: Node[]; memberById: Map<string, MemberUser> }) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="grid grid-cols-12 items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-2xs font-medium uppercase tracking-wider text-slate-500">
        <span className="col-span-6">Task</span>
        <span className="col-span-2">Status</span>
        <span className="col-span-2">Assignee</span>
        <span className="col-span-2">Due</span>
      </div>
      {tasks.map((task) => {
        const assignee = task.assigned_to ? memberById.get(task.assigned_to) : null
        return (
          <div
            key={task.id}
            className="grid grid-cols-12 items-center gap-2 border-b border-slate-800/50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-800/30"
          >
            <span
              className={cn(
                'col-span-6 truncate text-sm font-medium',
                task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-100',
              )}
            >
              {task.title}
            </span>
            <span className="col-span-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium capitalize',
                  task.status === 'done'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : task.status === 'in_progress'
                      ? 'bg-blue-500/10 text-blue-400'
                      : task.status === 'in_review'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-500/10 text-slate-400',
                )}
              >
                {(task.status ?? 'todo').replace('_', ' ')}
              </span>
            </span>
            <span className="col-span-2 flex items-center gap-1.5 text-xs text-slate-400">
              {assignee ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-4xs font-bold text-white">
                    {assignee.initials}
                  </span>
                  <span className="truncate">{assignee.name || assignee.email}</span>
                </>
              ) : (
                <span className="text-slate-600">Unassigned</span>
              )}
            </span>
            <span className="col-span-2 text-xs text-slate-500">
              {task.due_at ? new Date(task.due_at).toLocaleDateString() : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function AddTaskModal({
  workspaceId,
  workflowId,
  members,
  onClose,
  onCreated,
}: {
  workspaceId: string
  workflowId: string
  members: MemberUser[]
  onClose: () => void
  onCreated: (node: Node) => void
}) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          workspaceId,
          type: 'task',
          title: title.trim(),
          positionX: 0,
          positionY: 0,
          status,
          assignedTo: assignedTo || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body?.error || 'Failed to create task')
        setSaving(false)
        return
      }
      onCreated(body.data)
    } catch {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-title"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="add-task-title" className="text-lg font-bold text-slate-50">
            New task
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.label}
                </option>
              ))}
              <option value="backlog">Backlog</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Assignee</span>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || m.email || m.userId.slice(0, 6)}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Create task
          </button>
        </div>
      </div>
    </div>
  )
}
