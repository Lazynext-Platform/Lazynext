export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-48px)] items-center justify-center bg-slate-950" aria-busy="true" aria-label="Loading canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-brand" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  )
}
