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
  clear: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
  clear: () => set({ workspace: null }),
}))
