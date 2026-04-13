'use client'

import { useState } from 'react'
import { ExternalLink, Copy, Check, Eye, Clock, Lock, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const sampleNodes = [
  { id: '1', label: 'Product Roadmap', type: 'doc', x: 80, y: 60, color: 'bg-emerald-500' },
  { id: '2', label: 'Choose Database', type: 'decision', x: 320, y: 40, color: 'bg-orange-500' },
  { id: '3', label: 'Implement Auth', type: 'task', x: 560, y: 80, color: 'bg-blue-500' },
  { id: '4', label: 'Design Review', type: 'thread', x: 200, y: 220, color: 'bg-purple-500' },
  { id: '5', label: 'Build API', type: 'task', x: 440, y: 200, color: 'bg-blue-500' },
]

const sampleEdges = [
  { from: '1', to: '2' },
  { from: '2', to: '3' },
  { from: '1', to: '4' },
  { from: '4', to: '5' },
  { from: '3', to: '5' },
]

export default function SharedCanvasPage() {
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getNodePos(id: string) {
    const n = sampleNodes.find(n => n.id === id)
    return n ? { x: n.x + 60, y: n.y + 20 } : { x: 0, y: 0 }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-2xs font-bold text-white">L</div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Sprint Planning — Q2 2026</h1>
            <div className="flex items-center gap-2 text-2xs text-slate-500">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Read-only</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Updated 2 hours ago</span>
              <span>·</span>
              <span>5 nodes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowShareModal(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
            <Share2 className="h-3 w-3" /> Share
          </button>
          <a href="/" className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover">
            Try Lazynext <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {sampleEdges.map((edge, i) => {
              const from = getNodePos(edge.from)
              const to = getNodePos(edge.to)
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#334155" strokeWidth={1.5} strokeDasharray="6 4" />
              )
            })}
          </svg>

          {/* Nodes */}
          {sampleNodes.map(node => (
            <div key={node.id} className="absolute cursor-default" style={{ left: node.x, top: node.y }}>
              <div className="rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-3 shadow-lg backdrop-blur min-w-[120px]">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2.5 w-2.5 rounded-full', node.color)} />
                  <span className="text-2xs font-medium uppercase tracking-wider text-slate-500">{node.type}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-200">{node.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-2xs text-slate-500 backdrop-blur">
          <Lock className="h-3 w-3" /> Built with Lazynext · Read-only view
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Share Canvas</h2>
            <p className="mt-1 text-sm text-slate-400">Anyone with the link can view this canvas.</p>

            <div className="mt-4 flex items-center gap-2">
              <input type="text" readOnly value={typeof window !== 'undefined' ? window.location.href : ''} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 focus:outline-none" />
              <button onClick={handleCopy} className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-800/50 p-3">
              <p className="text-xs font-medium text-slate-400">Analytics</p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div><p className="text-lg font-bold text-slate-100">24</p><p className="text-2xs text-slate-500">Total views</p></div>
                <div><p className="text-lg font-bold text-slate-100">8</p><p className="text-2xs text-slate-500">Unique visitors</p></div>
                <div><p className="text-lg font-bold text-slate-100">2m</p><p className="text-2xs text-slate-500">Avg time</p></div>
              </div>
            </div>

            <button onClick={() => setShowShareModal(false)} className="mt-4 w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
