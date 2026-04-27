import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Sign in — Lazynext',
  },
  description:
    'Sign in to your Lazynext workspace. Tasks, docs, decisions, and AI in one place.',
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
