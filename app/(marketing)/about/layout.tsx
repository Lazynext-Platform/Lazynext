import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Lazynext',
  description: 'Meet the team building the anti-software workflow platform. India-first, decision-quality obsessed.',
  openGraph: {
    title: 'About — Lazynext',
    description: 'Meet the team building the anti-software workflow platform.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
