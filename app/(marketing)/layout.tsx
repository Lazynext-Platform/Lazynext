import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Marketing Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]">
              <span className="text-sm font-bold text-white">L</span>
            </div>
            <span className="text-lg font-bold text-slate-900">Lazynext</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
            <Link href="/templates" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Templates
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#4F6EF7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3D5BD4] transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {children}

      {/* Marketing Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F6EF7]">
                  <span className="text-xs font-bold text-white">L</span>
                </div>
                <span className="font-bold text-slate-900">Lazynext</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                The anti-software workflow platform. One place for tasks, docs, decisions, and AI.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><Link href="/#features" className="hover:text-slate-700">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-slate-700">Pricing</Link></li>
                <li><Link href="/templates" className="hover:text-slate-700">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><Link href="/about" className="hover:text-slate-700">About</Link></li>
                <li><Link href="/blog" className="hover:text-slate-700">Blog</Link></li>
                <li><Link href="/changelog" className="hover:text-slate-700">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><Link href="/privacy" className="hover:text-slate-700">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-700">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Lazynext. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
