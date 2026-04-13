import Link from 'next/link'
import MarketingHeader from '@/components/marketing/MarketingHeader'

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Compare', href: '/comparison' },
    { label: 'Changelog', href: '/changelog' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ],
  Support: [
    { label: 'Docs', href: '/docs' },
    { label: 'Contact', href: '/contact' },
  ],
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MarketingHeader />

      {children}

      {/* Marketing Footer */}
      <footer className="bg-slate-900 py-16 text-slate-400">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight text-white"
              >
                Lazynext
              </Link>
              <p className="mt-3 text-sm leading-relaxed">
                The operating system for work. Tasks, docs, decisions, and AI
                &mdash; one graph.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-4 text-sm font-semibold text-white">
                  {title}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
            <p className="text-sm">Built for teams. Priced for humans.</p>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Lazynext. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
