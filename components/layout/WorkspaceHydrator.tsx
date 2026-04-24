'use client'

import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace.store'

interface WorkspaceApiShape {
  id: string
  name: string
  slug: string
  plan: string
  logo: string | null
}

// Fetches the active workspace and hydrates the zustand store so client
// components (upgrade modal, plan gates, workspace selector, etc.) have
// access to `workspace.id`, `workspace.plan`, and `workspace.name` without
// drilling props. Runs at the workspace-layout level — one fetch per slug
// change.
export function WorkspaceHydrator({ slug }: { slug: string }) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/v1/workspace/${slug}`, { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { data?: WorkspaceApiShape }
        if (cancelled || !body.data) return
        setWorkspace(body.data)
      } catch {
        // silent fail — downstream surfaces fall back to their empty-store UI
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, setWorkspace])

  return null
}
