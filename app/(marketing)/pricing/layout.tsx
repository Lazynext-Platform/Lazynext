import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Lazynext',
  description: 'Simple, transparent pricing. Start free, scale as you grow. Paid plans from $19/seat/month — Enterprise custom.',
  openGraph: {
    title: 'Pricing — Lazynext',
    description: 'Simple, transparent pricing for teams of all sizes.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
