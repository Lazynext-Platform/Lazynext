import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare — Lazynext vs Notion, Linear, Asana',
  description: 'See how Lazynext compares to Notion, Linear, and Asana. One platform to replace them all.',
  alternates: { canonical: '/comparison' },
  openGraph: {
    title: 'Compare — Lazynext vs Notion, Linear, Asana',
    description: 'Feature-by-feature comparison of workflow platforms.',
    url: '/comparison',
  },
}

export default function ComparisonLayout({ children }: { children: React.ReactNode }) {
  return children
}
