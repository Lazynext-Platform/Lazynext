'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Shared shell for /docs/api/* pages. Adds a sticky sub-nav so readers
// can jump between Quickstart / Auth / Rate Limits / Webhooks /
// Versioning / Changelog without bouncing back to the index page.
//
// Client component so we can highlight the active link via usePathname().
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
  const pathname = usePathname()

  return (
    <div className="bg-white pt-16 text-slate-900">
      <nav
        aria-label="API documentation"
        className="sticky top-16 z-40 border-b border-slate-200 bg-white/90 backdrop-blur"
      >
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="flex gap-1 overflow-x-auto py-3 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUB_NAV.map((item) => {
              // Exact match for /docs/api root, prefix match for sub-pages.
              const isActive =
                item.href === '/docs/api'
                  ? pathname === '/docs/api'
                  : pathname?.startsWith(item.href) ?? false

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 font-semibold text-white'
                      : 'whitespace-nowrap rounded-full px-3 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          {/* Subtle right-edge fade so users see the bar scrolls horizontally on narrow viewports. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
          />
        </div>
      </nav>
      {children}
    </div>
  )
}
