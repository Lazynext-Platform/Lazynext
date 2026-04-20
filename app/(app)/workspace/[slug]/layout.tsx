'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WorkspaceTour } from '@/components/ui/WorkspaceTour'
import { GlobalLogDecisionShortcut } from '@/components/decisions/GlobalLogDecisionShortcut'
import { WmsHydrator } from '@/components/layout/WmsHydrator'
import { UpgradeModalHost } from '@/components/ui/UpgradeModalHost'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'

const LazyMindPanel = dynamic(() => import('@/components/lazymind/LazyMindPanel').then(m => ({ default: m.LazyMindPanel })), { ssr: false })
const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })), { ssr: false })

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const slug = params.slug as string
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#020617]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
          Skip to main content
        </a>
        <Sidebar workspaceSlug={slug} />

        <div
          className={cn(
            'flex min-h-screen flex-col transition-all duration-200',
            isSidebarOpen ? 'md:pl-60' : 'md:pl-0'
          )}
        >
          <TopBar />
          <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
        </div>

        <MobileBottomNav workspaceSlug={slug} />
        <CommandPalette />
        <LazyMindPanel />
        <KeyboardShortcutsModal />
        <WorkspaceTour />
        <GlobalLogDecisionShortcut workspaceSlug={slug} />
        <WmsHydrator slug={slug} />
        <UpgradeModalHost />
      </div>
    </ToastProvider>
  )
}
