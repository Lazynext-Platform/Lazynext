'use client'

import { FileText, Search, Star, Download, ArrowRight } from 'lucide-react'

const templates = [
  {
    id: '1',
    name: 'Product Sprint',
    description: 'Complete sprint workflow with tasks, docs, and decisions linked together.',
    category: 'Engineering',
    stars: 128,
    installs: 342,
    nodes: 12,
  },
  {
    id: '2',
    name: 'Feature Decision Log',
    description: 'Structured decision tracking for product features with AI quality scoring.',
    category: 'Product',
    stars: 89,
    installs: 215,
    nodes: 6,
  },
  {
    id: '3',
    name: 'Agency Client Project',
    description: 'Client-facing project template with deliverables, approvals, and milestones.',
    category: 'Agency',
    stars: 64,
    installs: 156,
    nodes: 15,
  },
  {
    id: '4',
    name: 'OKR Tracker',
    description: 'Quarterly OKR tracking with key results linked to tasks and pulse metrics.',
    category: 'Operations',
    stars: 45,
    installs: 98,
    nodes: 8,
  },
  {
    id: '5',
    name: 'Hiring Pipeline',
    description: 'End-to-end hiring workflow from job posting to offer with decision tracking.',
    category: 'HR',
    stars: 32,
    installs: 74,
    nodes: 10,
  },
  {
    id: '6',
    name: 'Startup Launch',
    description: 'Pre-launch checklist with marketing tasks, technical decisions, and go-live docs.',
    category: 'Startup',
    stars: 156,
    installs: 489,
    nodes: 20,
  },
]

const categories = ['All', 'Engineering', 'Product', 'Agency', 'Operations', 'HR', 'Startup']

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
          <FileText className="h-6 w-6 text-brand" />
          Template Marketplace
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Pre-built workflows to get your team started faster.
        </p>
      </div>

      {/* Search + filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              className="whitespace-nowrap rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors first:bg-brand first:border-brand first:text-white"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <div
            key={t.id}
            className="group rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand">
                {t.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="h-3 w-3" />
                {t.stars}
              </div>
            </div>
            <h3 className="mt-3 text-base font-semibold text-slate-100">{t.name}</h3>
            <p className="mt-1 text-sm text-slate-400 line-clamp-2">{t.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{t.nodes} nodes</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />{t.installs}
                </span>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                Use <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
