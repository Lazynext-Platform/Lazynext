'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Compare', href: '/comparison' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
]

export default function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-brand"
        >
          Lazynext
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <LocaleSwitcher compact />
          </div>
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-block"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-hover"
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
                aria-current={pathname === link.href ? 'page' : undefined}
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
  )
}
