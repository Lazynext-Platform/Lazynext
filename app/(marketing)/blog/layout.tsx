import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Lazynext',
  description: 'Product updates, workflow tips, and decision-making insights from the Lazynext team.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — Lazynext',
    description: 'Product updates, workflow tips, and decision-making insights.',
    url: '/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
