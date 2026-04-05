import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="text-center px-8">
        <p className="text-7xl font-extrabold text-slate-800">404</p>
        <h1 className="mt-4 text-lg font-semibold text-slate-300">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Go Back
          </Link>
        </div>
      </div>
    </div>
  )
}
