'use client'

import { useWorkspaceStore } from '@/stores/workspace.store'
import { ChevronDown } from 'lucide-react'

export function WorkspaceSelector() {
  const workspace = useWorkspaceStore((s) => s.workspace)

  return (
    <button
      aria-label={`Switch workspace: ${workspace?.name || 'Workspace'}`}
      className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-800 transition-colors"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-2xs font-bold text-brand-foreground">
        {workspace?.name?.charAt(0).toUpperCase() || 'L'}
      </div>
      <span
        className="text-sm font-semibold text-slate-200 truncate max-w-[120px]"
        title={workspace?.name || 'Workspace'}
      >
        {workspace?.name || 'Workspace'}
      </span>
      <ChevronDown className="h-3 w-3 text-slate-400" />
    </button>
  )
}
