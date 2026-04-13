'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WorkspaceTour } from '@/components/ui/WorkspaceTour'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'

const LazyMindPanel = dynamic(() => import('@/components/lazymind/LazyMindPanel').then(m => ({ default: m.LazyMindPanel })), { ssr: false })
const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })), { ssr: false })

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const slug = params.slug as string
  const { isSidebarOpen } = useUIStore()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#020617]">
        <Sidebar workspaceSlug={slug} />

        <div
          className={cn(
            'flex min-h-screen flex-col transition-all duration-200',
            isSidebarOpen ? 'md:pl-60' : 'md:pl-0'
          )}
        >
          <TopBar />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
        </div>

        <MobileBottomNav workspaceSlug={slug} />
        <CommandPalette />
        <LazyMindPanel />
        <KeyboardShortcutsModal />
        <WorkspaceTour />
      </div>
    </ToastProvider>
  )
}
