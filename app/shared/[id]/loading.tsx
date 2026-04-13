export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950" aria-busy="true" aria-label="Loading shared view">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-brand" />
        <p className="text-sm text-slate-500">Loading shared workflow...</p>
      </div>
    </div>
  )
}
