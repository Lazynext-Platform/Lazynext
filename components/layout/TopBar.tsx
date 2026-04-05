'use client'

import { UserButton } from '@clerk/nextjs'
import { Search, Bell, Menu, Command } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'

export function TopBar() {
  const { isSidebarOpen, toggleSidebar, toggleCommandPalette } = useUIStore()

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Search trigger */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 flex items-center gap-0.5 rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
        </button>

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
