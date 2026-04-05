'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Templates', href: '/templates' },
  { label: 'Blog', href: '/blog' },
]

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Templates', href: '/templates' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Marketing Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#4F6EF7]"
          >
            Lazynext
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-block"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center rounded-lg bg-[#4F6EF7] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4F6EF7]/25 transition-colors hover:bg-[#3D5BD4]"
            >
              Start Free
            </Link>
            {/* Mobile menu button */}
            <button
              className="p-2 text-slate-600 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-6 py-4 md:hidden">
            <div className="space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-sm font-medium text-slate-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className="block text-sm font-medium text-slate-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

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
            <p className="text-sm">Built in India. Priced for humans.</p>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Lazynext. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
