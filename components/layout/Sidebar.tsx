'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { WorkspaceSelector } from './WorkspaceSelector'
import { UpgradeModal, TrialBanner } from '@/components/ui/UpgradeModal'
import { LocaleSwitcher } from './LocaleSwitcher'
import { isFeatureUnlocked, type WmsLayer } from '@/lib/wms'

type NavGate = 'always' | 'tasks' | 'threads' | 'docs' | 'tables' | 'canvas' | 'automations' | 'integrations'

// Every item stays in the nav list. `gate` drives progressive exposure via the
// Workspace Maturity Score. No item is ever removed from the product — an
// "expand all" toggle surfaces them instantly for power users.
const navItems: Array<{ href: string; icon: typeof LayoutDashboard; label: string; gate: NavGate }> = [
  { href: '', icon: LayoutDashboard, label: 'Home', gate: 'always' },
  { href: '/decisions', icon: GitBranch, label: 'Decisions', gate: 'always' },
  { href: '/decisions/outcomes', icon: Clock, label: 'Outcomes', gate: 'always' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks', gate: 'tasks' },
  { href: '/pulse', icon: Activity, label: 'Pulse', gate: 'tasks' },
  { href: '/activity', icon: Clock, label: 'Activity', gate: 'tasks' },
  { href: '/templates', icon: FileText, label: 'Templates', gate: 'docs' },
  { href: '/canvas/default', icon: Network, label: 'Canvas', gate: 'canvas' },
  { href: '/automations', icon: Zap, label: 'Automations', gate: 'automations' },
]

const settingsItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/integrations', icon: Puzzle, label: 'Integrations' },
  { href: '/guide', icon: BookOpen, label: 'Platform Guide' },
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
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const base = `/workspace/${workspaceSlug}`

  // WMS-driven progressive exposure. Before hydration we optimistically show
  // everything so users never see a sidebar "shrink". After we know the real
  // score we honor the gating (unless power_user_override is on).
  const wmsScore = useWorkspaceStore((s) => s.wmsScore)
  const powerUserOverride = useWorkspaceStore((s) => s.powerUserOverride)
  const wmsLoaded = useWorkspaceStore((s) => s.wmsLoaded)
  const currentLayer: WmsLayer = useWorkspaceStore((s) => s.wmsLayer)

  const visibleNavItems = !wmsLoaded
    ? navItems
    : navItems.filter((item) => {
        if (item.gate === 'always') return true
        return isFeatureUnlocked(item.gate, wmsScore, powerUserOverride)
      })

  const lockedCount = navItems.length - visibleNavItems.length

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200',
        !isSidebarOpen && '-translate-x-full'
      )}
    >
      {/* Logo + Workspace selector */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Image src="/logo-dark.png" alt="Lazynext" width={24} height={24} className="h-6 w-6" />
          </Link>
          <WorkspaceSelector />
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {/* Navigation */}
        <div>
          <p className="px-3 text-2xs font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </p>
          <ul className="mt-2 space-y-0.5">
            {visibleNavItems.map((item) => {
              const href = `${base}${item.href}`
              const isActive = item.href === '' ? pathname === base : pathname.startsWith(href)
              return (
                <li key={item.label}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
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
                </li>
              )
            })}
          </ul>
          {wmsLoaded && lockedCount > 0 && (
            <button
              onClick={async () => {
                // Opt in to "show everything" — persists to DB + local store so
                // the sidebar never reverts.
                useWorkspaceStore.setState({ powerUserOverride: true })
                try {
                  await fetch(`/api/v1/workspace/${workspaceSlug}/wms`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ powerUserOverride: true }),
                  })
                } catch {
                  // already updated locally; server will sync next load
                }
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-colors"
              title={`${lockedCount} features unlock as your team records decisions & outcomes. Click to show all now.`}
            >
              <Plus className="h-3 w-3" />
              Show all {navItems.length} sections
              <span className="ml-auto rounded bg-slate-800 px-1.5 text-2xs font-semibold text-slate-400">L{currentLayer}</span>
            </button>
          )}
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
                aria-label={`Workflow: ${wf.name}`}
                aria-current={wf.active ? 'true' : undefined}
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
              aria-label="Create new workflow"
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
                aria-label={`Drag to add ${item.label} node`}
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
          <ul className="mt-2 space-y-0.5">
            {settingsItems.map((item) => {
              const href = `${base}${item.href}`
              const isActive = pathname === href || (item.href !== '' && pathname.startsWith(href))
              return (
                <li key={item.label}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
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
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-800 p-2 space-y-0.5">
        <TrialBanner />
        <LocaleSwitcher />
        <button aria-label="Open LazyMind AI assistant" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
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
