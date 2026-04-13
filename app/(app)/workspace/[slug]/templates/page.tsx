'use client'

import { useState } from 'react'
import { FileText, Search, Star, Download, ArrowRight, X, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const templates = [
  {
    id: '1', name: 'Product Sprint', description: 'Complete sprint workflow with tasks, docs, and decisions linked together.',
    category: 'Engineering', stars: 128, installs: 342, nodes: 12, featured: true,
    gradient: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-800/30',
    includes: { tasks: 6, docs: 3, decisions: 2, threads: 1 },
  },
  {
    id: '2', name: 'Feature Decision Log', description: 'Structured decision tracking for product features with AI quality scoring.',
    category: 'Product', stars: 89, installs: 215, nodes: 6, featured: false,
    gradient: 'from-orange-500/20 to-amber-500/20', borderColor: 'border-orange-800/30',
    includes: { tasks: 1, docs: 1, decisions: 4, threads: 0 },
  },
  {
    id: '3', name: 'Agency Client Project', description: 'Client-facing project template with deliverables, approvals, and milestones.',
    category: 'Agency', stars: 64, installs: 156, nodes: 15, featured: false,
    gradient: 'from-emerald-500/20 to-teal-500/20', borderColor: 'border-emerald-800/30',
    includes: { tasks: 8, docs: 4, decisions: 2, threads: 1 },
  },
  {
    id: '4', name: 'OKR Tracker', description: 'Quarterly OKR tracking with key results linked to tasks and pulse metrics.',
    category: 'Operations', stars: 45, installs: 98, nodes: 8, featured: false,
    gradient: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-800/30',
    includes: { tasks: 4, docs: 2, decisions: 1, threads: 1 },
  },
  {
    id: '5', name: 'Hiring Pipeline', description: 'End-to-end hiring workflow from job posting to offer with decision tracking.',
    category: 'HR', stars: 32, installs: 74, nodes: 10, featured: false,
    gradient: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-800/30',
    includes: { tasks: 5, docs: 2, decisions: 3, threads: 0 },
  },
  {
    id: '6', name: 'Startup Launch', description: 'Pre-launch checklist with marketing tasks, technical decisions, and go-live docs.',
    category: 'Startup', stars: 156, installs: 489, nodes: 20, featured: true,
    gradient: 'from-amber-500/20 to-orange-500/20', borderColor: 'border-amber-800/30',
    includes: { tasks: 10, docs: 5, decisions: 3, threads: 2 },
  },
]

const categories = ['All', 'Engineering', 'Product', 'Agency', 'Operations', 'HR', 'Startup']
const catColors: Record<string, string> = {
  Engineering: 'bg-blue-500/10 text-blue-400 border-blue-800/30',
  Product: 'bg-orange-500/10 text-orange-400 border-orange-800/30',
  Agency: 'bg-emerald-500/10 text-emerald-400 border-emerald-800/30',
  Operations: 'bg-cyan-500/10 text-cyan-400 border-cyan-800/30',
  HR: 'bg-purple-500/10 text-purple-400 border-purple-800/30',
  Startup: 'bg-amber-500/10 text-amber-400 border-amber-800/30',
}

const nodeTypeColors = [
  { type: 'task', color: 'bg-blue-500' },
  { type: 'doc', color: 'bg-emerald-500' },
  { type: 'decision', color: 'bg-orange-500' },
  { type: 'thread', color: 'bg-purple-500' },
]

export default function TemplatesPage() {
  const [activeCat, setActiveCat] = useState('All')
  const [installModal, setInstallModal] = useState<typeof templates[0] | null>(null)
  const [installed, setInstalled] = useState(false)

  const filtered = activeCat === 'All' ? templates : templates.filter(t => t.category === activeCat)
  const featured = templates.filter(t => t.featured)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
          <FileText className="h-6 w-6 text-brand" />
          Template Marketplace
        </h1>
        <p className="mt-1 text-sm text-slate-400">Pre-built workflows to get your team started faster.</p>
      </div>

      {/* Featured */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {featured.map(t => (
          <button key={t.id} onClick={() => { setInstalled(false); setInstallModal(t) }}
            className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 text-left transition-all hover:scale-[1.01]', t.gradient, t.borderColor)}>
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-2xs font-semibold text-amber-400">
              <Sparkles className="h-2.5 w-2.5" /> Featured
            </div>
            {/* Mini node tiles */}
            <div className="mb-3 flex gap-1.5 h-9">
              {nodeTypeColors.slice(0, Math.min(4, Math.ceil(t.nodes / 3))).map((n, i) => (
                <div key={i} className={cn('h-full w-8 rounded', n.color + '/20')} />
              ))}
              <div className="h-full w-8 rounded bg-slate-700/30" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">{t.name}</h3>
            <p className="mt-1 text-sm text-slate-400 line-clamp-2">{t.description}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Star className="h-3 w-3" />{t.stars}</span>
              <span>{t.nodes} nodes</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" />{t.installs}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search & filter */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search templates..." className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeCat === cat ? 'bg-brand border-brand text-white' :
                cat !== 'All' && catColors[cat] ? cn('border', catColors[cat]) :
                'border-slate-700 text-slate-400 hover:text-slate-200')}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map(t => (
          <div key={t.id} className="group rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-slate-700 transition-colors">
            {/* Gradient preview */}
            <div className={cn('h-20 bg-gradient-to-br flex items-end p-3 gap-1', t.gradient)}>
              {nodeTypeColors.slice(0, Math.min(4, Math.ceil(t.nodes / 3))).map((n, i) => (
                <div key={i} className={cn('h-4 w-6 rounded-sm', n.color + '/30')} />
              ))}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <span className={cn('rounded-full border px-2.5 py-0.5 text-2xs font-semibold', catColors[t.category] || 'bg-brand/10 text-brand border-brand/30')}>{t.category}</span>
                <div className="flex items-center gap-1 text-xs text-slate-500"><Star className="h-3 w-3" />{t.stars}</div>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-100">{t.name}</h3>
              <p className="mt-1 text-sm text-slate-400 line-clamp-2">{t.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{t.nodes} nodes</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" />{t.installs}</span>
                </div>
                <button onClick={() => { setInstalled(false); setInstallModal(t) }}
                  className="flex items-center gap-1 text-sm font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  Use <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Install Modal */}
      {installModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            {!installed ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">Install Template</h2>
                  <button onClick={() => setInstallModal(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
                </div>
                <div className={cn('mt-4 h-24 rounded-xl bg-gradient-to-br flex items-center justify-center', installModal.gradient)}>
                  <h3 className="text-lg font-bold text-slate-100">{installModal.name}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-400">{installModal.description}</p>

                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-800/50 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">This template includes:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {installModal.includes.tasks > 0 && <div className="flex items-center gap-2 text-xs text-slate-300"><div className="h-2 w-2 rounded-full bg-blue-500" />{installModal.includes.tasks} Tasks</div>}
                    {installModal.includes.docs > 0 && <div className="flex items-center gap-2 text-xs text-slate-300"><div className="h-2 w-2 rounded-full bg-emerald-500" />{installModal.includes.docs} Docs</div>}
                    {installModal.includes.decisions > 0 && <div className="flex items-center gap-2 text-xs text-slate-300"><div className="h-2 w-2 rounded-full bg-orange-500" />{installModal.includes.decisions} Decisions</div>}
                    {installModal.includes.threads > 0 && <div className="flex items-center gap-2 text-xs text-slate-300"><div className="h-2 w-2 rounded-full bg-purple-500" />{installModal.includes.threads} Threads</div>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300">Add to workflow</label>
                  <select className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 focus:border-brand focus:outline-none">
                    <option>Main Workflow</option>
                    <option>Create new workflow</option>
                  </select>
                </div>

                <div className="mt-6 flex gap-3">
                  <button onClick={() => setInstallModal(null)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancel</button>
                  <button onClick={() => setInstalled(true)} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Install Template</button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-100">Template Installed!</h3>
                <p className="mt-1 text-sm text-slate-400">{installModal.nodes} nodes added to your workflow.</p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setInstallModal(null)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">Close</button>
                  <button onClick={() => setInstallModal(null)} className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">View Canvas</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
