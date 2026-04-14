import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Decision Health' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
