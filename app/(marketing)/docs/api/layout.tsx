import Link from 'next/link'
import type { ReactNode } from 'react'

// Shared shell for /docs/api/* pages. Adds a sticky sub-nav so readers
// can jump between Quickstart / Auth / Rate Limits / Webhooks /
// Versioning / Changelog without bouncing back to the index page.
//
// The individual page files keep their own "← API Reference" backlink
// for the case where a reader lands deep without seeing the nav (very
// narrow viewport). That's deliberate redundancy, not duplication.

const SUB_NAV: Array<{ href: string; label: string }> = [
  { href: '/docs/api', label: 'Reference' },
  { href: '/docs/api/quickstart', label: 'Quickstart' },
  { href: '/docs/api/authentication', label: 'Authentication' },
  { href: '/docs/api/rate-limits', label: 'Rate Limits' },
  { href: '/docs/api/webhooks', label: 'Webhooks' },
  { href: '/docs/api/versioning', label: 'Versioning' },
  { href: '/docs/api/changelog', label: 'Changelog' },
]

export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white text-slate-900">
      <nav
        aria-label="API documentation"
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-6 py-3 text-sm">
          {SUB_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  )
}
