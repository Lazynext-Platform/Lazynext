'use client'

import { useWorkspaceStore } from '@/stores/workspace.store'

// Display-only workspace badge. Used to be a `<button>` with a chevron that
// suggested a multi-workspace switcher dropdown — there is no switcher modal
// in the codebase and no `/workspaces` route to navigate to. Until a real
// switcher ships, render the badge as static text + avatar so the chrome
// doesn't lie about its interactivity.
export function WorkspaceSelector() {
  const workspace = useWorkspaceStore((s) => s.workspace)
  const name = workspace?.name ?? 'Workspace'

  return (
    <div className="flex items-center gap-2 px-1 py-0.5" aria-label={`Current workspace: ${name}`}>
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-2xs font-bold text-brand-foreground">
        {name.charAt(0).toUpperCase()}
      </div>
      <span
        className="text-sm font-semibold text-slate-200 truncate max-w-[120px]"
        title={name}
      >
        {name}
      </span>
    </div>
  )
}
