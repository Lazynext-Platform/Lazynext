import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog — Lazynext',
  description: 'What\u2019s new in Lazynext. Feature releases, improvements, and fixes.',
  openGraph: {
    title: 'Changelog — Lazynext',
    description: 'Track every update to the Lazynext platform.',
  },
}

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children
}
