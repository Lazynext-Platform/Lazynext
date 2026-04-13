export default function WorkspaceLoading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-brand" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  )
}
