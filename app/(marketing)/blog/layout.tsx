import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Lazynext',
  description: 'Product updates, workflow tips, and decision-making insights from the Lazynext team.',
  openGraph: {
    title: 'Blog — Lazynext',
    description: 'Product updates, workflow tips, and decision-making insights.',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
