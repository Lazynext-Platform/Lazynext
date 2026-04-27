'use client'

import { Search, Menu, Command, Sparkles, User, LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { NotificationCenter } from '@/components/ui/NotificationCenter'
import { createClient } from '@/lib/db/supabase/client'
import { useState } from 'react'

// v1.3.3.3 — removed three pieces of fake-tenant chrome that every signed-in
// user saw regardless of their actual workspace:
//   1. Hardcoded "Acme Corp / Q2 Product Sprint" breadcrumb. Now reads the
//      real workspace name from `useWorkspaceStore` (hydrated by
//      WorkspaceHydrator at the (app) shell layer). Workflow sub-segment
//      removed entirely — there is no "named workflow" primitive.
//   2. Three-avatar presence cluster (AP / PK / JR). No presence channel
//      ships today; canvas renders `CollaborationOverlay collaborators={[]}`.
//   3. Dead "New Workflow" + "Share" buttons. Neither had an onClick;
//      no ShareModal exists in the codebase.

export function TopBar() {
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleLazyMind = useUIStore((s) => s.toggleLazyMind)
  const [showMenu, setShowMenu] = useState(false)
  const workspace = useWorkspaceStore((s) => s.workspace)
  // Fall back to a neutral label while the store is hydrating, never to
  // a fake tenant name. The breadcrumb just won't appear for ~1 paint.
  const workspaceName = workspace?.name ?? 'Workspace'

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/sign-in'
    } catch {
      window.location.href = '/sign-in'
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <>
            <Link href="/">
              <Image src="/icon.svg" alt="Lazynext" width={24} height={24} className="h-6 w-6 rounded-md" />
            </Link>
            <button
              onClick={toggleSidebar}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Breadcrumb — real workspace name from the hydrated store. */}
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm sm:flex">
          <span className="font-semibold text-white">
            {workspaceName}
          </span>
        </nav>

        {/* Search trigger */}
        <button
          onClick={toggleCommandPalette}
          aria-label="Open command palette"
          data-tour="command-palette"
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="ml-4 hidden items-center gap-0.5 rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 text-2xs font-medium text-slate-300 sm:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* LazyMind AI */}
        <button aria-label="Open LazyMind AI assistant" data-tour="lazymind-button" onClick={toggleLazyMind} className="hidden items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand-hover lg:flex">
          <Sparkles className="h-3.5 w-3.5" /> LazyMind
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="User menu"
            aria-expanded={showMenu}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300 hover:bg-slate-600"
          >
            <User className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg z-50">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
