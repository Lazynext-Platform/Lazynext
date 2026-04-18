'use client'

import { useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/workspace.store'
import type { WmsLayer } from '@/lib/wms'

// Fetches the current workspace's WMS score once per slug change and hydrates
// the zustand store. The Sidebar reads the store and progressively exposes
// features based on layer. This runs at the layout level so every page in
// the workspace benefits without extra wiring.
export function WmsHydrator({ slug }: { slug: string }) {
  const setWms = useWorkspaceStore((s) => s.setWms)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/v1/workspace/${slug}/wms`, { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { data?: { score: number; layer: WmsLayer; powerUserOverride: boolean } }
        if (cancelled || !body.data) return
        setWms({
          score: body.data.score,
          layer: body.data.layer,
          powerUserOverride: body.data.powerUserOverride,
        })
      } catch {
        // silently fail — sidebar stays in "show everything" optimistic mode
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, setWms])

  return null
}
