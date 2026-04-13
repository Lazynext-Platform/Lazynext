'use client'

import { useState } from 'react'
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
  ChevronLeft,
  MessageCircle,
  Plus,
  Users,
  ListTodo,
  CreditCard,
  Puzzle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'
import { WorkspaceSelector } from './WorkspaceSelector'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

const navItems = [
  { href: '', icon: LayoutDashboard, label: 'Home' },
  { href: '/canvas/default', icon: Network, label: 'Canvas' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/decisions', icon: GitBranch, label: 'Decisions' },
  { href: '/pulse', icon: Activity, label: 'Pulse' },
  { href: '/automations', icon: Zap, label: 'Automations' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/activity', icon: Clock, label: 'Activity' },
]

const settingsItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/integrations', icon: Puzzle, label: 'Integrations' },
]

const workflows = [
  { name: 'Q2 Product Sprint', active: true },
  { name: 'Client Onboarding', active: false },
  { name: 'Bug Triage', active: false },
]

const primitiveItems = [
  { type: 'task', icon: CheckSquare, label: 'Task', dot: 'bg-blue-400' },
  { type: 'doc', icon: FileText, label: 'Doc', dot: 'bg-emerald-400' },
  { type: 'decision', icon: GitBranch, label: 'Decision', dot: 'bg-orange-400' },
  { type: 'thread', icon: MessageCircle, label: 'Thread', dot: 'bg-purple-400' },
  { type: 'pulse', icon: Activity, label: 'Pulse', dot: 'bg-cyan-400' },
  { type: 'automation', icon: Zap, label: 'Automation', dot: 'bg-amber-400' },
]

export function Sidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname()
  const { isSidebarOpen, toggleSidebar } = useUIStore()
  const [showUpgrade, setShowUpgrade] = useState(false)
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
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {/* Navigation */}
        <div>
          <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </p>
          <div className="mt-2 space-y-0.5">
            {navItems.map((item) => {
              const href = `${base}${item.href}`
              const isActive = item.href === '' ? pathname === base : pathname.startsWith(href)
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
        </div>

        {/* Workflows section */}
        <div className="mt-6">
          <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-slate-500">
            Workflows
          </p>
          <div className="mt-2 space-y-0.5">
            {workflows.map((wf) => (
              <button
                key={wf.name}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  wf.active
                    ? 'bg-slate-800/70 font-medium text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                {wf.active && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                {wf.name}
              </button>
            ))}
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Workflow
            </button>
          </div>
        </div>

        {/* Primitives section */}
        <div className="mt-6">
          <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-slate-500">
            Primitives
          </p>
          <div className="mt-2 space-y-0.5">
            {primitiveItems.map((item) => (
              <button
                key={item.type}
                draggable
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-grab"
              >
                <span className={cn('h-2 w-2 rounded-full', item.dot)} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace section */}
        <div className="mt-6">
          <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
          <div className="mt-2 space-y-0.5">
            {settingsItems.map((item) => {
              const href = `${base}${item.href}`
              const isActive = pathname === href || (item.href !== '' && pathname.startsWith(href))
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
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-800 p-2 space-y-0.5">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
          <Sparkles className="h-4 w-4 text-brand" />
          LazyMind AI
        </button>
        <button
          onClick={() => setShowUpgrade(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand/30 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 transition-colors"
        >
          Upgrade to Pro
        </button>
      </div>

      {showUpgrade && <UpgradeModal variant="full-upgrade" onClose={() => setShowUpgrade(false)} />}
    </aside>
  )
}
