'use client'

import { X, MessageCircle, Link, Clock, User, Send } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { NODE_COLORS, type NodeType } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'

const sampleThread = [
  { id: 't1', author: 'Priya', initials: 'PK', color: 'bg-emerald-500', message: 'Why not PlanetScale?', time: '2h ago' },
  { id: 't2', author: 'Avas', initials: 'AP', color: 'bg-indigo-500', message: 'MySQL syntax + no RLS. Supabase wins on DX.', time: '1h ago' },
]

export function NodeDetailPanelLegacy({ nodeId }: { nodeId: string }) {
  const nodes = useCanvasStore((s) => s.nodes)
  const selectNode = useCanvasStore((s) => s.selectNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const node = nodes.find((n) => n.id === nodeId)

  if (!node) return null

  const raw = node.data as Record<string, unknown>
  const type = node.type as NodeType
  const colors = NODE_COLORS[type]
  const isDecision = type === 'decision'

  const s = (k: string): string => String(raw[k] ?? '')
  const n = (k: string): number | undefined => typeof raw[k] === 'number' ? (raw[k] as number) : undefined
  const a = (k: string): string[] => Array.isArray(raw[k]) ? (raw[k] as string[]) : []

  const title = s('title')
  const status = s('status')
  const assignee = s('assignee')
  const resolution = s('resolution')
  const rationale = s('rationale')
  const decisionType = s('decisionType')
  const outcome = s('outcome')
  const qualityScore = n('qualityScore')
  const options = a('options')

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl motion-safe:animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {type}
          </span>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {/* Title */}
        <input
          type="text"
          defaultValue={title}
          onBlur={(e) => updateNodeData(nodeId, { title: e.target.value })}
          className="w-full bg-transparent text-lg font-semibold text-slate-50 placeholder-slate-600 focus:outline-none"
          placeholder="Untitled"
        />

        {/* Status */}
        {status && (
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
              <Clock className="h-3 w-3" /> Status
            </label>
            {isDecision ? (
              <span className={cn(
                'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                status === 'decided'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              )}>
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  status === 'decided' ? 'bg-emerald-400' : 'bg-amber-400'
                )} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            ) : (
              <select
                defaultValue={status}
                onChange={(e) => updateNodeData(nodeId, { status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
                aria-label="Status"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        )}

        {/* Assignee (tasks only) */}
        {type === 'task' && (
          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
              <User className="h-3 w-3" /> Assignee
            </label>
            <input
              type="text"
              defaultValue={assignee}
              onBlur={(e) => updateNodeData(nodeId, { assignee: e.target.value })}
              placeholder="Assign to..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
        )}

        {/* ===== DECISION DNA FIELDS ===== */}
        {isDecision && (
          <>
            {/* Question */}
            <div className="mt-5">
              <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                Question
              </label>
              <p className="mt-1.5 text-sm text-slate-300">{title}</p>
            </div>

            {/* Resolution */}
            {resolution && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Resolution
                </label>
                <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-sm leading-relaxed text-slate-200">{resolution}</p>
                </div>
              </div>
            )}

            {/* Rationale */}
            {rationale && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Rationale
                </label>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{rationale}</p>
              </div>
            )}

            {/* Options Considered */}
            {options.length > 0 && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Options Considered
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <span
                      key={opt}
                      className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300"
                    >
                      {opt}
                    </span>
                  ))}
                  <button className="rounded-full border border-dashed border-slate-600 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-400">
                    + Add
                  </button>
                </div>
              </div>
            )}

            {/* Decision Type */}
            {decisionType && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Decision Type
                </label>
                <span className="mt-1.5 block text-sm text-slate-300">{decisionType}</span>
              </div>
            )}

            {/* Quality Score */}
            {qualityScore !== undefined && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Quality Score
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        qualityScore >= 70
                          ? 'bg-emerald-500'
                          : qualityScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      )}
                      style={{ width: `${qualityScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-200">
                    {qualityScore}/100
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Good options coverage. Strong rationale.
                </p>
              </div>
            )}

            {/* Outcome */}
            {outcome && (
              <div className="mt-5">
                <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
                  Outcome
                </label>
                <span className="mt-1.5 inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">
                  {outcome}
                </span>
              </div>
            )}
          </>
        )}

        {/* Description (non-decision types) */}
        {!isDecision && (
          <div className="mt-4">
            <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
              Description
            </label>
            <textarea
              placeholder="Add a description..."
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
          </div>
        )}

        {/* Links */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <Link className="h-3 w-3" /> Linked Nodes
          </div>
          <div className="mt-2 rounded-lg border border-dashed border-slate-700 py-6 text-center">
            <p className="text-xs text-slate-500">No linked nodes yet</p>
            <button className="mt-1 text-xs text-brand hover:text-brand-hover">
              + Add link
            </button>
          </div>
        </div>

        {/* Thread */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-2xs+ font-semibold uppercase tracking-wider text-slate-500">
            <MessageCircle className="h-3 w-3" /> Thread
          </div>

          {/* Sample messages */}
          <div className="mt-3 space-y-3">
            {sampleThread.map((msg) => (
              <div key={msg.id} className="flex gap-2.5">
                <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', msg.color)}>
                  {msg.initials}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-slate-200">{msg.author}</span>
                    <span className="text-2xs text-slate-500">{msg.time}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            />
            <button className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors" aria-label="Send comment">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
