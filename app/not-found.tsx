import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-50">404</h1>
        <p className="mt-4 text-lg text-slate-400">This page doesn&apos;t exist. Maybe it never did.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
