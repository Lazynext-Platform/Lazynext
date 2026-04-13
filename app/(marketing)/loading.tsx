export default function MarketingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}
