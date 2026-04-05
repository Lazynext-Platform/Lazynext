'use client'

import { X, MessageCircle, Link, Clock, User, Tag } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'

export function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const { nodes, selectNode, updateNodeData } = useCanvasStore()
  const node = nodes.find((n) => n.id === nodeId)

  if (!node) return null

  const data = node.data as Record<string, string>
  const type = node.type as NodeType
  const colors = NODE_COLORS[type]

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <span className={cn('text-xs font-bold uppercase tracking-wider', 'text-slate-400')}>
            {type}
          </span>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {/* Title */}
        <input
          type="text"
          defaultValue={data.title}
          onBlur={(e) => updateNodeData(nodeId, { title: e.target.value })}
          className="w-full bg-transparent text-lg font-semibold text-slate-50 placeholder-slate-600 focus:outline-none"
          placeholder="Untitled"
        />

        {/* Status */}
        {data.status && (
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Clock className="h-3 w-3" /> Status
            </label>
            <select
              defaultValue={data.status}
              onChange={(e) => updateNodeData(nodeId, { status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {/* Assignee */}
        {type === 'task' && (
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <User className="h-3 w-3" /> Assignee
            </label>
            <input
              type="text"
              defaultValue={data.assignee || ''}
              onBlur={(e) => updateNodeData(nodeId, { assignee: e.target.value })}
              placeholder="Assign to..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
        )}

        {/* Quality score for decisions */}
        {type === 'decision' && (data as Record<string, unknown>).qualityScore !== undefined && (
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500">Quality Score</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    Number((data as Record<string, unknown>).qualityScore) >= 70 ? 'bg-emerald-500' :
                    Number((data as Record<string, unknown>).qualityScore) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${(data as Record<string, unknown>).qualityScore}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-200">
                {String((data as Record<string, unknown>).qualityScore)}
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500">Description</label>
          <textarea
            placeholder="Add a description..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none resize-none"
          />
        </div>

        {/* Links section */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link className="h-3 w-3" /> Linked Nodes
          </div>
          <div className="mt-2 rounded-lg border border-dashed border-slate-700 py-6 text-center">
            <p className="text-xs text-slate-500">No linked nodes yet</p>
            <button className="mt-1 text-xs text-brand hover:text-brand-hover">
              + Add link
            </button>
          </div>
        </div>

        {/* Thread section */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <MessageCircle className="h-3 w-3" /> Comments
          </div>
          <div className="mt-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
              />
              <button className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
