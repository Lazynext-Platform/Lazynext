'use client'

import { create } from 'zustand'

interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  logo: string | null
}

interface WorkspaceState {
  workspace: Workspace | null
  setWorkspace: (ws: Workspace) => void

  // ─── Workspace Maturity Score (WMS) ─────────────────────────
  // Drives progressive feature exposure in the sidebar + command
  // palette. `wmsLoaded` guards against flashing the full nav
  // before hydration.
  wmsScore: number
  wmsLayer: 1 | 2 | 3 | 4
  powerUserOverride: boolean
  wmsLoaded: boolean
  setWms: (args: { score: number; layer: 1 | 2 | 3 | 4; powerUserOverride: boolean }) => void

  clear: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),

  wmsScore: 0,
  wmsLayer: 1,
  powerUserOverride: false,
  wmsLoaded: false,
  setWms: ({ score, layer, powerUserOverride }) =>
    set({ wmsScore: score, wmsLayer: layer, powerUserOverride, wmsLoaded: true }),

  clear: () => set({ workspace: null, wmsScore: 0, wmsLayer: 1, powerUserOverride: false, wmsLoaded: false }),
}))
