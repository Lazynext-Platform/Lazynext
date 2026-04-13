'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Shortcut {
  keys: { label: string; colorClass?: string }[]
  description: string
}

interface ShortcutGroup {
  title: string
  titleColor?: string
  shortcuts: Shortcut[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: [{ label: '⌘' }, { label: 'K' }], description: 'Open command palette' },
      { keys: [{ label: '⌘' }, { label: '⇧' }, { label: 'F' }], description: 'Global search' },
      { keys: [{ label: '⌘' }, { label: '\\' }], description: 'Toggle sidebar' },
      { keys: [{ label: 'G' }, { label: 'then' }, { label: 'D' }], description: 'Go to Decisions' },
      { keys: [{ label: 'G' }, { label: 'then' }, { label: 'P' }], description: 'Go to Pulse' },
      { keys: [{ label: 'G' }, { label: 'then' }, { label: 'S' }], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: [{ label: 'N' }], description: 'Open add node menu' },
      { keys: [{ label: 'N' }, { label: 'then' }, { label: 'T', colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }], description: 'Add Task node' },
      { keys: [{ label: 'N' }, { label: 'then' }, { label: 'D', colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }], description: 'Add Doc node' },
      { keys: [{ label: 'N' }, { label: 'then' }, { label: 'Q', colorClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }], description: 'Add Decision node' },
      { keys: [{ label: '⌘' }, { label: 'A' }], description: 'Select all nodes' },
      { keys: [{ label: '⌫' }], description: 'Delete selected' },
      { keys: [{ label: '⌘' }, { label: 'D' }], description: 'Duplicate selected' },
      { keys: [{ label: '⌘' }, { label: '1' }], description: 'Zoom to fit' },
      { keys: [{ label: '⌘' }, { label: 'Z' }], description: 'Undo' },
      { keys: [{ label: '⌘' }, { label: '⇧' }, { label: 'Z' }], description: 'Redo' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: [{ label: 'Enter' }], description: 'Open node panel' },
      { keys: [{ label: 'Esc' }], description: 'Close / cancel' },
      { keys: [{ label: '⌘' }, { label: 'B' }], description: 'Bold text' },
      { keys: [{ label: '/' }], description: 'Slash command' },
      { keys: [{ label: '@' }], description: 'Mention teammate' },
    ],
  },
  {
    title: 'LazyMind AI',
    titleColor: 'text-brand',
    shortcuts: [
      { keys: [{ label: '⌘' }, { label: 'J' }], description: 'Open LazyMind' },
      { keys: [{ label: '⌘' }, { label: '⇧' }, { label: 'W' }], description: 'Weekly digest' },
    ],
  },
]

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      setIsOpen((o) => !o)
    }
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-200">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-6 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className={cn('text-xs font-bold uppercase tracking-widest', group.titleColor || 'text-slate-500')}>
                {group.title}
              </h3>
              <div className="mt-3 space-y-2">
                {group.shortcuts.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-300">{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) =>
                        k.label === 'then' ? (
                          <span key={ki} className="text-2xs text-slate-600 mx-0.5">then</span>
                        ) : (
                          <kbd
                            key={ki}
                            className={cn(
                              'inline-flex min-w-[24px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium',
                              k.colorClass || 'border-slate-600 bg-slate-800 text-slate-300'
                            )}
                          >
                            {k.label}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3">
          <p className="text-2xs text-slate-600">
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-2xs text-slate-400">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  )
}
