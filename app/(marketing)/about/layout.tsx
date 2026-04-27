import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Lazynext',
  description: 'Meet the team building the anti-software workflow platform. Global-first, decision-quality obsessed.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About — Lazynext',
    description: 'Meet the team building the anti-software workflow platform.',
    url: '/about',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
