import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features — Lazynext',
  description: 'Graph-native canvas, Decision DNA, 7 primitives, LazyMind AI, Pulse analytics, and more.',
  openGraph: {
    title: 'Features — Lazynext',
    description: 'Everything your team needs in one unified workspace.',
  },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children
}
