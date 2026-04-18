'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  workspaceSlug: string
}

// Global ⌘D / Ctrl+D handler: opens the Decision Logger from anywhere
// in the workspace by navigating to /workspace/<slug>/decisions?log=1
// (which auto-opens the log modal). Ignores the shortcut if the user is
// typing in an input/textarea/contenteditable element.
export function GlobalLogDecisionShortcut({ workspaceSlug }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false
      return target.isContentEditable
    }

    function onKey(e: KeyboardEvent) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() !== 'd') return
      if (isEditable(e.target)) return
      e.preventDefault()

      const target = `/workspace/${workspaceSlug}/decisions?log=1`
      // If we're already on the decisions page, force a re-trigger via URL
      if (pathname?.endsWith('/decisions')) {
        router.replace(target)
      } else {
        router.push(target)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, pathname, workspaceSlug])

  return null
}
