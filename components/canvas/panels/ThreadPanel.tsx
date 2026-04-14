'use client'

import { useState, useRef } from 'react'
import { X, MessageCircle, Send, Paperclip, Check, Circle } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { cn } from '@/lib/utils/cn'

interface ThreadMessage {
  id: string
  author: string
  initials: string
  avatarColor: string
  content: string
  time: string
  table?: { headers: string[]; rows: { cells: { value: string; type: 'check' | 'x' | 'tilde' | 'text' }[] }[] }
  mention?: string
  reactions?: { emoji: string; count: number; active?: boolean }[]
}

const sampleMessages: ThreadMessage[] = [
  {
    id: '1',
    author: 'Avas Patel',
    initials: 'AP',
    avatarColor: 'bg-indigo-500',
    content: "I've done a comparison of DB providers. Here's the summary:",
    time: '3 days ago',
    table: {
      headers: ['Feature', 'Supabase', 'Firebase', 'PlanetScale'],
      rows: [
        { cells: [{ value: 'Auth Built-in', type: 'text' }, { value: '✓', type: 'check' }, { value: '✓', type: 'check' }, { value: '✗', type: 'x' }] },
        { cells: [{ value: 'RLS Policies', type: 'text' }, { value: '✓', type: 'check' }, { value: '✗', type: 'x' }, { value: '✗', type: 'x' }] },
        { cells: [{ value: 'Real-time', type: 'text' }, { value: '✓', type: 'check' }, { value: '✓', type: 'check' }, { value: '✗', type: 'x' }] },
        { cells: [{ value: 'Free Tier', type: 'text' }, { value: '0.5 GB', type: 'text' }, { value: '1 GB', type: 'text' }, { value: '5 GB', type: 'text' }] },
        { cells: [{ value: 'SQL Flavor', type: 'text' }, { value: 'Postgres', type: 'text' }, { value: 'NoSQL', type: 'text' }, { value: 'MySQL', type: 'text' }] },
      ],
    },
  },
  {
    id: '2',
    author: 'Priya Sharma',
    initials: 'PS',
    avatarColor: 'bg-emerald-500',
    content: "PlanetScale has a much larger free tier though. Shouldn't we consider that?",
    time: '3 days ago',
    reactions: [{ emoji: '👍', count: 1 }],
  },
  {
    id: '3',
    author: 'Avas Patel',
    initials: 'AP',
    avatarColor: 'bg-indigo-500',
    content: "PlanetScale uses MySQL — our queries are Postgres-specific. Supabase gives us Auth + DB + RLS in one platform. Firebase is NoSQL so we'd lose relational queries.",
    time: '2 days ago',
  },
  {
    id: '4',
    author: 'Raj Kumar',
    initials: 'RK',
    avatarColor: 'bg-amber-500',
    content: 'Makes sense. I agree with Supabase. @Priya Sharma what do you think?',
    time: '2 days ago',
    mention: 'Priya Sharma',
  },
  {
    id: '5',
    author: 'Priya Sharma',
    initials: 'PS',
    avatarColor: 'bg-emerald-500',
    content: "Alright, let's go with Supabase then 👍",
    time: '1 day ago',
    reactions: [{ emoji: '👍', count: 3, active: true }, { emoji: '🎉', count: 2 }],
  },
]

const mentionOptions = [
  { name: 'Avas Patel', initials: 'AP', color: 'bg-indigo-500', role: 'Admin' },
  { name: 'Priya Sharma', initials: 'PS', color: 'bg-emerald-500', role: 'Admin' },
  { name: 'Raj Kumar', initials: 'RK', color: 'bg-amber-500', role: 'Member' },
  { name: 'Neha Kapoor', initials: 'NK', color: 'bg-pink-500', role: 'Guest' },
]

export function ThreadPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes } = useCanvasStore()
  const node = nodes.find((n) => n.id === nodeId)
  const [isResolved, setIsResolved] = useState(false)
  const [input, setInput] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!node) return null
  const d = node.data as Record<string, unknown>
  const title = String(d.title || 'Untitled')
  const status = String(d.status || '')
  const qualityScore = typeof d.qualityScore === 'number' ? d.qualityScore : undefined

  const handleInput = (val: string) => {
    setInput(val)
    setShowMentions(val.endsWith('@'))
  }

  const insertMention = (name: string) => {
    setInput((prev) => prev.replace(/@$/, `@${name} `))
    setShowMentions(false)
  }

  const cellColor = (type: string) => {
    switch (type) {
      case 'check': return 'text-emerald-400'
      case 'x': return 'text-red-400'
      case 'tilde': return 'text-amber-400'
      default: return 'text-slate-300'
    }
  }

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

      {/* Decision summary */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {status === 'decided' && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-2xs font-medium text-emerald-400">Decided</span>
          )}
          {qualityScore !== undefined && (
            <span className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold',
              qualityScore >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            )}>
              {qualityScore} Quality
            </span>
          )}
          <time dateTime="2026-04-02" className="text-2xs text-slate-500">Apr 2, 2026</time>
        </div>
      </div>

      {/* Thread header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">Thread</span>
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-2xs font-medium text-slate-400">{sampleMessages.length}</span>
        </div>
        <button
          onClick={() => setIsResolved(!isResolved)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            isResolved ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
          )}
        >
          {isResolved ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
          {isResolved ? 'Resolved' : 'Mark Resolved'}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4" role="log" aria-label="Thread messages">
        {sampleMessages.map((msg) => (
          <div key={msg.id} className="flex gap-2.5">
            <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', msg.avatarColor)}>
              {msg.initials}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-slate-200">{msg.author}</span>
                <span className="text-2xs text-slate-500">{msg.time}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400">
                {msg.mention
                  ? msg.content.split(`@${msg.mention}`).map((part, i, arr) => (
                      <span key={`${msg.id}-mention-${i}`}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="inline-flex items-center rounded bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">@{msg.mention}</span>
                        )}
                      </span>
                    ))
                  : msg.content}
              </p>

              {/* Comparison table */}
              {msg.table && (
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-2xs+" aria-label="Comparison data">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/50">
                        {msg.table.headers.map((h) => (
                          <th key={h} scope="col" className="px-2.5 py-1.5 text-left font-semibold text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.table.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-slate-800 last:border-0">
                          {row.cells.map((cell, ci) => (
                            <td key={ci} className={cn('px-2.5 py-1.5', cellColor(cell.type))}>
                              {cell.value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reactions */}
              {msg.reactions && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {msg.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors',
                        r.active ? 'bg-brand/15 text-brand' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      )}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="relative border-t border-slate-800 p-3">
        {/* @mention popover */}
        {showMentions && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
            <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">Mention a teammate</p>
            {mentionOptions.map((m) => (
              <button
                key={m.name}
                onClick={() => insertMention(m.name)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-700 transition-colors"
              >
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-3xs font-bold text-white', m.color)}>
                  {m.initials}
                </span>
                <span className="flex-1 text-sm text-slate-200">{m.name}</span>
                <span className="text-2xs text-slate-500">{m.role}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Add a comment... (@ to mention)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
            style={{ maxHeight: 120 }}
          />
          <button className="rounded-lg p-2 text-slate-400 hover:text-slate-300" aria-label="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors" aria-label="Send message">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-2xs text-slate-600">Threads stay attached to this decision forever.</p>
      </div>
    </div>
  )
}
