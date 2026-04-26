'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { cn } from '@/lib/utils/cn'

const decisionStatusOptions = [
  { value: 'open', label: 'Open', color: 'bg-slate-700 text-slate-300' },
  { value: 'in_discussion', label: 'In Discussion', color: 'bg-amber-500/15 text-amber-400' },
  { value: 'decided', label: 'Decided', color: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'revisit', label: 'Revisit', color: 'bg-red-500/15 text-red-400' },
]

const outcomeOptions = [
  { value: 'pending', label: 'Pending', color: 'text-slate-400' },
  { value: 'good', label: 'Good', color: 'text-emerald-400' },
  { value: 'bad', label: 'Bad', color: 'text-red-400' },
  { value: 'neutral', label: 'Neutral', color: 'text-slate-400' },
]

const sampleThread = [
  { id: '1', author: 'Priya Sharma', initials: 'PS', color: 'bg-emerald-500', message: "Why not PlanetScale? Their free tier is more generous.", time: '3 days ago' },
  { id: '2', author: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500', message: "PlanetScale uses MySQL. Our queries are Postgres-specific. Plus Supabase has Auth + RLS built in.", time: '2 days ago' },
]

export function DecisionDetailPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const nodes = useCanvasStore((s) => s.nodes)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const node = nodes.find((n) => n.id === nodeId)

  const d = (node?.data ?? {}) as Record<string, unknown>
  const [title, setTitle] = useState(String(d.title || ''))
  const [status, setStatus] = useState(String(d.status || 'open'))
  const [resolution, setResolution] = useState(String(d.resolution || ''))
  const [rationale, setRationale] = useState(String(d.rationale || ''))
  const [outcome, setOutcome] = useState(String(d.outcome || 'pending'))
  const [threadOpen, setThreadOpen] = useState(false)

  if (!node) return null
  const qualityScore = typeof d.qualityScore === 'number' ? d.qualityScore : undefined
  const options = Array.isArray(d.options) ? (d.options as string[]) : []
  const decisionType = String(d.decisionType || 'Reversible')

  const scoreColor = qualityScore !== undefined
    ? qualityScore >= 70 ? 'text-emerald-400' : qualityScore >= 40 ? 'text-amber-400' : 'text-red-400'
    : ''
  const scoreBg = qualityScore !== undefined
    ? qualityScore >= 70 ? 'from-emerald-500/20 to-emerald-500/5' : qualityScore >= 40 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5'
    : ''
  const scoreBarColor = qualityScore !== undefined
    ? qualityScore >= 70 ? 'bg-emerald-500' : qualityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
    : ''

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-orange-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Decision</span>
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
          onBlur={() => updateNodeData(nodeId, { title })}
          maxLength={200}
          className="w-full bg-transparent text-xl font-bold text-slate-50 placeholder-slate-600 focus:outline-none"
          placeholder="What's the decision?"
        />

        {/* Status */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); updateNodeData(nodeId, { status: e.target.value }) }}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          >
            {decisionStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Question */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Question</label>
          <div className="mt-1.5 rounded-lg bg-slate-800 p-3">
            <p className="text-sm text-slate-300">{title || 'No question defined'}</p>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Resolution</label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            onBlur={() => updateNodeData(nodeId, { resolution })}
            placeholder="What was decided..."
            rows={2}
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>

        {/* Rationale */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Rationale</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            onBlur={() => updateNodeData(nodeId, { rationale })}
            placeholder="Why this choice..."
            rows={3}
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>

        {/* Options Considered */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Options Considered</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <span
                key={opt}
                className={cn(
                  'rounded-full border-2 px-3 py-1 text-xs font-medium',
                  i === 0 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-400'
                )}
              >
                {opt}
              </span>
            ))}
            <button className="rounded-full border border-dashed border-slate-600 px-3 py-1 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-400">+ Add</button>
          </div>
        </div>

        {/* Decision Type */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Decision Type</label>
          <select
            defaultValue={decisionType}
            onChange={(e) => updateNodeData(nodeId, { decisionType: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          >
            <option value="Reversible">Reversible</option>
            <option value="Irreversible">Irreversible</option>
          </select>
        </div>

        {/* Quality Score */}
        {qualityScore !== undefined && (
          <div>
            <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Quality Score</label>
            <div className={cn('mt-1.5 rounded-xl bg-gradient-to-br p-4', scoreBg)}>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-4xl font-bold', scoreColor)}>{qualityScore}</span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={qualityScore} aria-valuemin={0} aria-valuemax={100} aria-label="Quality score">
                <div className={cn('h-full rounded-full transition-all', scoreBarColor)} style={{ width: `${qualityScore}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Good options coverage. Strong rationale.</p>
            </div>
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => { setOutcome(e.target.value); updateNodeData(nodeId, { outcome: e.target.value }) }}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
          >
            {outcomeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Made by */}
        <div>
          <label className="text-2xs+ font-semibold uppercase tracking-wider text-slate-500">Made by</label>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">AP</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Avas Patel</p>
              <p className="text-2xs text-slate-500">Apr 2, 2026</p>
            </div>
          </div>
        </div>

        {/* Thread */}
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={() => setThreadOpen(!threadOpen)}
            className="flex w-full items-center justify-between text-2xs+ font-semibold uppercase tracking-wider text-slate-500"
          >
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" />
              Thread
              <span className="rounded bg-slate-700 px-1.5 py-0.5 text-2xs font-medium text-slate-400">{sampleThread.length}</span>
            </div>
            {threadOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {threadOpen && (
            <div className="mt-3 space-y-3">
              {sampleThread.map((msg) => (
                <div key={msg.id} className="flex gap-2.5">
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', msg.color)}>
                    {msg.initials}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-slate-200">{msg.author}</span>
                      <span className="text-2xs text-slate-500">{msg.time}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" placeholder="Reply..." maxLength={500} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none" />
                <button className="rounded-lg bg-brand p-1.5 text-brand-foreground hover:bg-brand-hover" aria-label="Send">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="border-t border-slate-800 pt-4">
          <button className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" /> Delete decision
          </button>
        </div>
      </div>
    </div>
  )
}
