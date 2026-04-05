'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Network,
  GitBranch,
  Activity,
  FileText,
  Zap,
  Settings,
  Sparkles,
  CheckSquare,
  Table,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'
import { WorkspaceSelector } from './WorkspaceSelector'

const navItems = [
  { href: '', icon: LayoutDashboard, label: 'Home' },
  { href: '/canvas/default', icon: Network, label: 'Canvas' },
  { href: '/decisions', icon: GitBranch, label: 'Decisions' },
  { href: '/pulse', icon: Activity, label: 'Pulse' },
  { href: '/templates', icon: FileText, label: 'Templates' },
]

const primitiveItems = [
  { type: 'task', icon: CheckSquare, label: 'Tasks', color: 'text-blue-400' },
  { type: 'doc', icon: FileText, label: 'Docs', color: 'text-emerald-400' },
  { type: 'decision', icon: GitBranch, label: 'Decisions', color: 'text-orange-400' },
  { type: 'table', icon: Table, label: 'Tables', color: 'text-teal-400' },
  { type: 'automation', icon: Zap, label: 'Automations', color: 'text-amber-400' },
]

export function Sidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname()
  const { isSidebarOpen, toggleSidebar } = useUIStore()
  const base = `/workspace/${workspaceSlug}`

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200',
        !isSidebarOpen && '-translate-x-full'
      )}
    >
      {/* Workspace selector */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800 px-4">
        <WorkspaceSelector />
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const href = `${base}${item.href}`
            const isActive = pathname === href || (item.href && pathname.startsWith(href))
            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Primitives section */}
        <div className="mt-6">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Primitives
          </p>
          <div className="mt-2 space-y-0.5">
            {primitiveItems.map((item) => (
              <button
                key={item.type}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <item.icon className={cn('h-4 w-4', item.color)} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-800 p-2">
        <Link
          href={`${base}/settings`}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.includes('/settings')
              ? 'bg-brand/10 text-brand'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-brand" />
          LazyMind AI
        </button>
      </div>
    </aside>
  )
}
