'use client'

import { useState } from 'react'
import { X, Clock, User, Tag, Paperclip, Trash2, CheckSquare, Plus } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { cn } from '@/lib/utils/cn'

const statusOptions = [
  { value: 'todo', label: 'To Do', dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { value: 'in_review', label: 'In Review', dot: 'bg-purple-500' },
  { value: 'done', label: 'Done', dot: 'bg-emerald-500' },
  { value: 'blocked', label: 'Blocked', dot: 'bg-red-500' },
]

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'border-slate-600 text-slate-400' },
  { value: 'medium', label: 'Medium', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
  { value: 'high', label: 'High', color: 'border-orange-500 bg-orange-500/10 text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'border-red-500 bg-red-500/10 text-red-400' },
]

const assigneeOptions = [
  { name: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500' },
  { name: 'Priya Sharma', initials: 'PS', color: 'bg-emerald-500' },
  { name: 'Raj Kumar', initials: 'RK', color: 'bg-amber-500' },
]

interface Subtask {
  id: string
  text: string
  done: boolean
}

export function TaskDetailPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, updateNodeData } = useCanvasStore()
  const node = nodes.find((n) => n.id === nodeId)

  const d = (node?.data ?? {}) as Record<string, unknown>
  const [title, setTitle] = useState(String(d.title || ''))
  const [status, setStatus] = useState(String(d.status || 'todo'))
  const [priority, setPriority] = useState(String(d.priority || 'medium'))
  const [subtasks, setSubtasks] = useState<Subtask[]>([
    { id: '1', text: 'Wireframe review', done: true },
    { id: '2', text: 'API integration', done: false },
    { id: '3', text: 'QA testing', done: false },
  ])
  const [newSubtask, setNewSubtask] = useState('')

  if (!node) return null

  const handleTitleBlur = () => updateNodeData(nodeId, { title })
  const handleStatusChange = (val: string) => {
    setStatus(val)
    updateNodeData(nodeId, { status: val })
  }
  const handlePriorityChange = (val: string) => {
    setPriority(val)
    updateNodeData(nodeId, { priority: val })
  }
  const toggleSubtask = (id: string) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)))
  }
  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks((prev) => [...prev, { id: Date.now().toString(), text: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Task</span>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="Close panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full bg-transparent text-xl font-bold text-slate-50 placeholder-slate-600 focus:outline-none"
          placeholder="Untitled task"
        />

        {/* Status */}
        <div>
          <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <Clock className="h-3 w-3" /> Status
          </label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Priority</label>
          <div className="mt-1.5 flex gap-1">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePriorityChange(opt.value)}
                className={cn(
                  'flex-1 rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors',
                  priority === opt.value ? opt.color : 'border-slate-700 text-slate-500 hover:border-slate-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <User className="h-3 w-3" /> Assignee
          </label>
          <select
            defaultValue={String(d.assignee || '')}
            onChange={(e) => updateNodeData(nodeId, { assignee: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((a) => (
              <option key={a.initials} value={a.initials}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Due Date</label>
          <input
            type="date"
            defaultValue=""
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Description</label>
          <textarea
            placeholder="Add a description..."
            rows={3}
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <CheckSquare className="h-3 w-3" /> Subtasks
          </label>
          <div className="mt-2 space-y-1.5">
            {subtasks.map((st) => (
              <label key={st.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={st.done}
                  onChange={() => toggleSubtask(st.id)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-brand focus:ring-brand"
                />
                <span className={cn('text-sm', st.done ? 'line-through text-slate-500' : 'text-slate-300')}>
                  {st.text}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              placeholder="Add subtask..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
            <button onClick={addSubtask} className="text-xs text-brand hover:text-brand-hover">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <Tag className="h-3 w-3" /> Tags
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">frontend</span>
            <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">v2</span>
            <button className="rounded-full border border-dashed border-slate-600 px-2.5 py-0.5 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-400">+ Add</button>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <Paperclip className="h-3 w-3" /> Attachments
          </label>
          <button className="mt-1.5 w-full rounded-lg border border-dashed border-slate-700 py-4 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors">
            Drop files or click to upload
          </button>
        </div>

        {/* Delete */}
        <div className="border-t border-slate-800 pt-4">
          <button className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" /> Delete task
          </button>
        </div>
      </div>
    </div>
  )
}
