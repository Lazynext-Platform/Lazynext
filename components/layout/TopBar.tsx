'use client'

import { UserButton } from '@clerk/nextjs'
import { Search, Menu, Command, ChevronDown, Sparkles, Share2, Plus } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { NotificationCenter } from '@/components/ui/NotificationCenter'
import { cn } from '@/lib/utils/cn'

const presenceAvatars = [
  { initials: 'AP', color: 'bg-indigo-500' },
  { initials: 'PK', color: 'bg-emerald-500' },
  { initials: 'JR', color: 'bg-amber-500' },
]

export function TopBar() {
  const { isSidebarOpen, toggleSidebar, toggleCommandPalette, toggleLazyMind } = useUIStore()

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumb */}
        <div className="hidden items-center gap-1 text-sm sm:flex">
          <button className="flex items-center gap-1 font-semibold text-white hover:text-slate-300">
            Acme Corp <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          <span className="text-slate-600">/</span>
          <button className="flex items-center gap-1 font-medium text-slate-300 hover:text-white">
            Q2 Product Sprint <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
        </div>

        {/* New Workflow button */}
        <button className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300 lg:flex">
          <Plus className="h-3 w-3" /> New Workflow
        </button>

        {/* Search trigger */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="ml-4 hidden items-center gap-0.5 rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 sm:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Presence avatars */}
        <div className="hidden items-center -space-x-2 lg:flex">
          {presenceAvatars.map((a) => (
            <div
              key={a.initials}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-bold text-white',
                a.color
              )}
            >
              {a.initials}
            </div>
          ))}
        </div>

        {/* Share */}
        <button className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:flex">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>

        {/* LazyMind AI */}
        <button onClick={toggleLazyMind} className="hidden items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover lg:flex">
          <Sparkles className="h-3.5 w-3.5" /> LazyMind
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-7 w-7',
            },
          }}
        />
      </div>
    </header>
  )
}
