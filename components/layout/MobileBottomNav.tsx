'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Network, ListTodo, GitBranch, Activity, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const items = [
  { href: '', icon: LayoutDashboard, label: 'Home' },
  { href: '/canvas/default', icon: Network, label: 'Canvas' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/decisions', icon: GitBranch, label: 'Decisions' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileBottomNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname()
  const base = `/workspace/${workspaceSlug}`

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800 bg-slate-900 pb-safe md:hidden">
      {items.map((item) => {
        const href = `${base}${item.href}`
        const isActive = pathname === href || (item.href && pathname.startsWith(href))
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1',
              isActive ? 'text-brand' : 'text-slate-500'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-2xs font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
