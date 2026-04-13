'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  CheckSquare,
  FileText,
  GitBranch,
  Sparkles,
  ArrowRight,
  Command,
  X,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'

const quickActions = [
  { icon: CheckSquare, label: 'Create Task', desc: 'Add a new task node', shortcut: 'T', color: 'bg-blue-500' },
  { icon: FileText, label: 'Create Doc', desc: 'Start a new document', shortcut: 'D', color: 'bg-emerald-500' },
  { icon: GitBranch, label: 'Log Decision', desc: 'Record a team decision', shortcut: 'X', color: 'bg-orange-500' },
  { icon: Sparkles, label: 'Open LazyMind', desc: 'AI-powered assistant', shortcut: '⌘L', color: 'bg-brand' },
]

const recentItems = [
  { type: 'task', icon: CheckSquare, color: 'bg-blue-500', title: 'Ship onboarding v2', meta: 'In Progress', time: '2h ago' },
  { type: 'decision', icon: GitBranch, color: 'bg-orange-500', title: 'Use Supabase for Auth + DB?', meta: 'Decided · Score 84', time: '1d ago' },
  { type: 'doc', icon: FileText, color: 'bg-emerald-500', title: 'Product Requirements Doc', meta: '1,240 words', time: '3d ago' },
]

const navItems = [
  { label: 'Go to Decision DNA', href: '#' },
  { label: 'Go to Settings', href: '#' },
  { label: 'Go to Templates', href: '#' },
]

export function CommandPalette() {
  const { isCommandPaletteOpen, toggleCommandPalette } = useUIStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const close = useCallback(() => {
    toggleCommandPalette()
    setQuery('')
    setSelectedIndex(0)
  }, [toggleCommandPalette])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleCommandPalette()
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isCommandPaletteOpen, toggleCommandPalette, close])

  if (!isCommandPaletteOpen) return null

  const filteredActions = query
    ? quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : quickActions

  const filteredRecent = query
    ? recentItems.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))
    : recentItems

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={close}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg animate-scaleIn rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <kbd className="flex items-center gap-0.5 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Quick Actions
              </p>
              {filteredActions.map((a, i) => (
                <button
                  key={a.label}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    selectedIndex === i
                      ? 'bg-brand/10 border-l-2 border-brand/30'
                      : 'hover:bg-slate-800'
                  )}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', a.color)}>
                    <a.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-200">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    {a.shortcut}
                  </kbd>
                </button>
              ))}
            </div>
          )}

          {/* Recent */}
          {filteredRecent.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Recent
              </p>
              {filteredRecent.map((r) => (
                <button
                  key={r.title}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-800 transition-colors"
                >
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', r.color)}>
                    <r.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-200">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.meta}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{r.time}</span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {!query && (
            <div>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Navigation
              </p>
              {navItems.map((n) => (
                <button
                  key={n.label}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  {n.label}
                </button>
              ))}
            </div>
          )}

          {/* Empty */}
          {filteredActions.length === 0 && filteredRecent.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">No results for &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5">↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5">esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}
