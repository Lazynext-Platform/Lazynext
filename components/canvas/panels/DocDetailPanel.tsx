'use client'

import { useState } from 'react'
import { X, Share2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, Code, Link2, Quote } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'
import { cn } from '@/lib/utils/cn'

const collaborators = [
  { initials: 'AP', color: 'bg-indigo-500' },
  { initials: 'RK', color: 'bg-amber-500' },
  { initials: 'PD', color: 'bg-pink-500' },
]

const toolbarGroups = [
  [
    { icon: Bold, label: 'Bold' },
    { icon: Italic, label: 'Italic' },
    { icon: Underline, label: 'Underline' },
    { icon: Strikethrough, label: 'Strikethrough' },
  ],
  [
    { icon: Heading1, label: 'Heading 1' },
    { icon: Heading2, label: 'Heading 2' },
    { icon: Heading3, label: 'Heading 3' },
  ],
  [
    { icon: List, label: 'Bullet list' },
    { icon: Code, label: 'Code' },
    { icon: Link2, label: 'Link' },
    { icon: Quote, label: 'Quote' },
  ],
]

export function DocDetailPanel({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, updateNodeData } = useCanvasStore()
  const node = nodes.find((n) => n.id === nodeId)

  const d = (node?.data ?? {}) as Record<string, unknown>
  const [title, setTitle] = useState(String(d.title || ''))

  if (!node) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Doc</span>
          </div>
          <span className="text-xs text-slate-500">1,240 words</span>
          <span className="text-xs text-slate-500">Last edited 2h ago</span>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Share" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <Share2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label="Close panel">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collaborators */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <div className="flex -space-x-1.5">
          {collaborators.map((c) => (
            <span key={c.initials} className={cn('flex h-6 w-6 items-center justify-center rounded-full text-3xs font-bold text-white ring-2 ring-slate-900', c.color)}>
              {c.initials}
            </span>
          ))}
        </div>
        <button aria-label="Add collaborator" className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-600 text-2xs text-slate-500 hover:border-slate-500 hover:text-slate-400">+</button>
        <span className="text-2xs text-slate-500">3 collaborators</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-slate-800 px-4 py-1.5 overflow-x-auto no-scrollbar">
        {toolbarGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <span className="mx-1 h-4 w-px bg-slate-700" />}
            {group.map((tool) => (
              <button
                key={tool.label}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label={tool.label}
              >
                <tool.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ))}
        <span className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-2xs text-slate-500">
          <span className="font-mono">/</span> commands
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateNodeData(nodeId, { title })}
          className="w-full bg-transparent text-xl font-bold text-slate-50 placeholder-slate-600 focus:outline-none"
          placeholder="Untitled document"
        />

        {/* Sample content */}
        <div className="prose prose-invert prose-sm mt-4 max-w-none">
          <h2 className="text-base font-semibold text-slate-200">Overview</h2>
          <p className="text-sm leading-relaxed text-slate-400">
            This document outlines the Q2 sprint objectives and key milestones. The focus is on shipping the core workflow canvas and Decision DNA features.
          </p>
          <h2 className="mt-4 text-base font-semibold text-slate-200">Key Requirements</h2>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>Complete canvas node interactions with drag-and-drop</li>
            <li>Implement Decision DNA quality scoring algorithm</li>
            <li>Ship mobile NodeListView for responsive access</li>
            <li>Integrate LazyMind AI panel with workflow context</li>
          </ul>
          <h2 className="mt-4 text-base font-semibold text-slate-200">Timeline</h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Sprint runs April 1–30. Linked task: <span className="inline-flex items-center rounded bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400">@Ship onboarding v2</span>
          </p>
        </div>
      </div>
    </div>
  )
}
