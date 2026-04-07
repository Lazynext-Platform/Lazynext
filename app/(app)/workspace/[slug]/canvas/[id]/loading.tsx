export default function CanvasLoading() {
  return (
    <div className="flex h-[calc(100vh-48px)] items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#4F6EF7]" />
        <p className="text-sm text-slate-400">Loading canvas...</p>
      </div>
    </div>
  )
}
